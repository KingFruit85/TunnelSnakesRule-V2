// src/app/lib/db/results.ts
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  plays,
  games,
  sessions,
  leaderboardResults,
  teamResults,
  outcomeResults,
  players,
} from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { GameAndWinner, PlayerResult } from "@/app/lib/definitions";
import { resolveEffectiveRules } from "./rules";
import { getBoardgameById } from "./games";
import { checkIfPlayerIsClubMember } from "./players";

type CheckedPlayerEntry = {
  playerId: string;
  score: string;
  team: string;
};

function parseCheckedPlayers(formData: FormData): CheckedPlayerEntry[] {
  const entries: CheckedPlayerEntry[] = [];
  for (const [key, value] of formData.entries()) {
    const [prefix, playerId] = key.split("_");
    if (prefix !== "player") continue;
    const [playedGame, score, team] = value.toString().split(",");
    if (playedGame === "true") {
      entries.push({ playerId, score, team });
    }
  }
  return entries;
}

export async function recordPlayResults(formData: FormData) {
  "use server";
  const sessionId = formData.get("sessionId")?.toString();
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString() ?? null;

  if (!sessionId || !gameId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Authorize against the session's own clubId, resolved server-side, rather
  // than a client-supplied clubId field: sessionId and clubId arrive as two
  // independent form values, and checking membership against a clubId the
  // caller can set independently of sessionId would let a member of one
  // club record results against another club's session (the same class of
  // cross-tenant IDOR already fixed in addImageToSession).
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  const clubId = session.clubId;
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  const rules = await resolveEffectiveRules(clubId, gameId);
  const checkedPlayers = parseCheckedPlayers(formData);

  const [play] = await db
    .insert(plays)
    .values({ id: uuidv4(), sessionId, gameId, notes })
    .returning();

  switch (rules.winCondition) {
    case "leaderboard": {
      for (const entry of checkedPlayers) {
        await db.insert(leaderboardResults).values({
          playId: play.id,
          playerId: entry.playerId,
          score: Number(entry.score) || 0,
        });
      }
      break;
    }

    case "team_based": {
      const winningTeam = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(teamResults).values({
          playId: play.id,
          playerId: entry.playerId,
          team: entry.team,
          won: winningTeam !== "Tie" && entry.team === winningTeam,
        });
      }
      break;
    }

    case "cooperative": {
      const outcome = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(outcomeResults).values({
          playId: play.id,
          playerId: entry.playerId,
          won: outcome === "Players",
        });
      }
      break;
    }

    case "single_winner":
    case "single_loser": {
      const selectedPlayerId =
        rules.winCondition === "single_winner"
          ? formData.get("winner")?.toString()
          : formData.get("loser")?.toString();
      const participantIds = formData.getAll("participant").map((id) => id.toString());
      // The participant checkboxes and the winner/loser avatar picker are two
      // independent form controls (not wired together client-side), so a
      // stale or tampered submission could name a selected player who was
      // unchecked as a participant. Failing loudly here beats silently
      // writing a play where nobody actually won/lost, or everybody did.
      if (participantIds.length === 0) {
        throw new Error("At least one participant must be selected");
      }
      if (!selectedPlayerId || !participantIds.includes(selectedPlayerId)) {
        throw new Error(
          rules.winCondition === "single_winner"
            ? "The selected winner must be one of the checked participants"
            : "The selected loser must be one of the checked participants"
        );
      }
      for (const playerId of participantIds) {
        const isSelected = playerId === selectedPlayerId;
        const won = rules.winCondition === "single_winner" ? isSelected : !isSelected;
        await db.insert(outcomeResults).values({ playId: play.id, playerId, won });
      }
      break;
    }
  }

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}

/** Every result row recorded for one play, in the old PlayerResult shape UI already consumes. */
export async function getPlayResultsForPlay(play: typeof plays.$inferSelect): Promise<PlayerResult[]> {
  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
    db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
    db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
  ]);

  return [
    ...leaderboardRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: String(row.score),
      eventId: play.id,
    } as PlayerResult)),
    ...teamRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: row.won ? "Won" : "Lost",
      team: row.team,
      eventId: play.id,
    } as PlayerResult)),
    ...outcomeRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: row.won ? "Won" : "Lost",
      eventId: play.id,
    } as PlayerResult)),
  ];
}

export async function getEventNotes(playId: string): Promise<string> {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  return play?.notes ?? "";
}

export async function getEventWinner(playId: string): Promise<GameAndWinner> {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) {
    return { id: playId as any, winner: "" };
  }

  const [teamRows, outcomeRows] = await Promise.all([
    db.select().from(teamResults).where(eq(teamResults.playId, playId)),
    db.select().from(outcomeResults).where(eq(outcomeResults.playId, playId)),
  ]);

  if (teamRows.length > 0) {
    const winningRow = teamRows.find((row) => row.won);
    return { id: playId as any, winner: winningRow ? winningRow.team : "Tied" };
  }

  if (outcomeRows.length > 0) {
    const winningRow = outcomeRows.find((row) => row.won);
    if (!winningRow) {
      return { id: playId as any, winner: "Tied" };
    }
    const [winningPlayer] = await db.select().from(players).where(eq(players.id, winningRow.playerId));
    return { id: playId as any, winner: winningPlayer?.name ?? "Unknown" };
  }

  const leaderboardRows = await db
    .select()
    .from(leaderboardResults)
    .where(eq(leaderboardResults.playId, playId));

  if (leaderboardRows.length === 0) {
    return { id: playId as any, winner: "" };
  }

  const [game] = await db.select().from(games).where(eq(games.id, play.gameId));
  const highScoreWins = game?.scoringDirection !== "low";
  const best = leaderboardRows.reduce((acc, row) =>
    highScoreWins ? (row.score > acc.score ? row : acc) : (row.score < acc.score ? row : acc)
  );
  const [winningPlayer] = await db.select().from(players).where(eq(players.id, best.playerId));
  return { id: playId as any, winner: winningPlayer?.name ?? "Unknown" };
}

export type GroupedBoardgameTotalPlays = {
  [gameName: string]: number;
};

export async function getPlayerEvents(playerId: string): Promise<GroupedBoardgameTotalPlays> {
  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select({ playId: leaderboardResults.playId }).from(leaderboardResults).where(eq(leaderboardResults.playerId, playerId)),
    db.select({ playId: teamResults.playId }).from(teamResults).where(eq(teamResults.playerId, playerId)),
    db.select({ playId: outcomeResults.playId }).from(outcomeResults).where(eq(outcomeResults.playerId, playerId)),
  ]);

  const playIds = [...new Set([...leaderboardRows, ...teamRows, ...outcomeRows].map((r) => r.playId))];
  if (playIds.length === 0) {
    return {};
  }

  const playedGames = await db.select().from(plays).where(inArray(plays.id, playIds));
  const result: GroupedBoardgameTotalPlays = {};

  for (const play of playedGames) {
    const game = await getBoardgameById(play.gameId);
    result[game.name] = (result[game.name] ?? 0) + 1;
  }
  return result;
}
