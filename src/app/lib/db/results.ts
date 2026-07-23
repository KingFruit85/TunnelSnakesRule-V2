// src/app/lib/db/results.ts
//
// Reads only. The one mutation (recordPlayResults) lives in
// results-actions.ts - see the header comment in players.ts for why this
// split exists.
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  plays,
  games,
  leaderboardResults,
  teamResults,
  outcomeResults,
  players,
} from "@/db/schema";
import { GameAndWinner, PlayerResult } from "@/app/lib/definitions";
import { getBoardgameById } from "./games";
import { resolveEffectiveRules } from "./rules";

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

export type PlaySummary = {
  playId: string;
  gameId: string;
  gameName: string;
  summary: string;
  detail: string;
  notes: string | null;
};

// Computes the design doc's per-play summary/detail strings ("Holly won ·
// 11 pts", "Holly 11 · Dan 9 · You 8") at render time rather than storing
// them - the raw leaderboard/team/outcome rows are the source of truth.
// Deliberately does NOT reuse getEventWinner: that function collapses
// cooperative/single_winner/single_loser into "the name of one player with
// won:true", which is right for single_winner but wrong for cooperative
// ("Everyone won"/"The game won", not a player's name) and doesn't
// distinguish single_loser's "X lost" phrasing either. It also reads
// scoring direction off the base game only, ignoring club_game_variants -
// the same divergence already flagged in stats.ts's getClubStats. This
// function uses resolveEffectiveRules instead, matching getClubStats's
// approach, so both screens agree on which play a club's rules make a win.
export async function getSessionPlaySummaries(clubId: string, sessionId: string): Promise<PlaySummary[]> {
  const sessionPlays = await db.select().from(plays).where(eq(plays.sessionId, sessionId));
  if (sessionPlays.length === 0) {
    return [];
  }

  const summaries: PlaySummary[] = [];
  for (const play of sessionPlays) {
    const [game, rules, leaderboardRows, teamRows, outcomeRows] = await Promise.all([
      getBoardgameById(play.gameId),
      resolveEffectiveRules(clubId, play.gameId),
      db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
      db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
      db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
    ]);

    // Looked up per play (not once for the whole session) so a play's
    // participant list only ever needs the players who actually appear in
    // ITS OWN result rows - a direct query against `players`, not a reuse
    // of sessions.ts's getAllPlayersBySessionId (see the import note above
    // for why: that would create a circular module dependency).
    const participantIds = [
      ...leaderboardRows.map((r) => r.playerId),
      ...teamRows.map((r) => r.playerId),
      ...outcomeRows.map((r) => r.playerId),
    ];
    const nameRows = participantIds.length
      ? await db
          .select({ id: players.id, name: players.name })
          .from(players)
          .where(inArray(players.id, participantIds))
      : [];
    const nameById = new Map(nameRows.map((r) => [r.id, r.name]));
    const nameFor = (id: string) => nameById.get(id) ?? "Unknown";

    let summary = "";
    let detail = "";

    if (leaderboardRows.length > 0) {
      const highWins = rules.scoringDirection !== "low";
      const sorted = [...leaderboardRows].sort((a, b) => (highWins ? b.score - a.score : a.score - b.score));
      summary = `${nameFor(sorted[0].playerId)} won · ${sorted[0].score} pts`;
      detail = sorted.map((r) => `${nameFor(r.playerId)} ${r.score}`).join(" · ");
    } else if (teamRows.length > 0) {
      const winners = teamRows.filter((r) => r.won).map((r) => nameFor(r.playerId));
      const losers = teamRows.filter((r) => !r.won).map((r) => nameFor(r.playerId));
      const winningTeam = teamRows.find((r) => r.won)?.team;
      summary = winningTeam ? `Team ${winningTeam} won` : "Tied";
      detail = `${winners.join(", ") || "No one"} beat ${losers.join(", ") || "no one"}`;
    } else if (rules.winCondition === "cooperative") {
      const anyWon = outcomeRows.some((r) => r.won);
      summary = anyWon ? "Everyone won" : "The game won";
      detail = outcomeRows.map((r) => nameFor(r.playerId)).join(", ");
    } else {
      const isSingleWinner = rules.winCondition === "single_winner";
      const picked = outcomeRows.find((r) => (isSingleWinner ? r.won : !r.won));
      const pickedName = picked ? nameFor(picked.playerId) : "Someone";
      summary = isSingleWinner ? `${pickedName} won` : `${pickedName} lost`;
      detail = `Played: ${outcomeRows.map((r) => nameFor(r.playerId)).join(", ")}`;
    }

    summaries.push({
      playId: play.id,
      gameId: play.gameId,
      gameName: game.name,
      summary,
      detail,
      notes: play.notes,
    });
  }
  return summaries;
}
