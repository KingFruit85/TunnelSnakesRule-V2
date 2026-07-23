"use server";
// src/app/lib/db/results-actions.ts
//
// Server Actions for the results domain: recordPlayResults (insert a new
// play) and updatePlayResults (replace an existing play's results in
// place, for the design doc's "Edit result" screen). Split out of
// results.ts - see the header comment in players.ts for why. Must NOT
// `import "server-only"`.
//
// This is the module the schema spec's invariants are about: these two
// functions are the *only* places that resolve a play's effective win
// condition and write to one of the three result tables.
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import {
  plays,
  sessions,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { resolveEffectiveRules, type EffectiveRules } from "./rules";
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

// Shared by recordPlayResults (new play) and updatePlayResults (replace an
// existing play) so the five-way win-condition branching lives in exactly
// one place. Both callers have already inserted/kept the `plays` row by
// the time this runs - this only writes the *result* rows.
async function writeResultRows(
  playId: string,
  rules: EffectiveRules,
  checkedPlayers: CheckedPlayerEntry[],
  formData: FormData
) {
  switch (rules.winCondition) {
    case "leaderboard": {
      for (const entry of checkedPlayers) {
        await db.insert(leaderboardResults).values({
          playId,
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
          playId,
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
          playId,
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
        await db.insert(outcomeResults).values({ playId, playerId, won });
      }
      break;
    }
  }
}

export async function recordPlayResults(formData: FormData) {
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

  await writeResultRows(play.id, rules, checkedPlayers, formData);

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}

// Replaces an existing play's game/notes/results in place, for the design
// doc's "Edit result" screen ("Save: ... appends or replaces the play").
// Keeps the same play id (only the three result tables are deleted and
// rewritten) so anything referencing this play's id externally stays
// valid across an edit.
export async function updatePlayResults(playId: string, formData: FormData) {
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString() ?? null;

  if (!gameId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) {
    throw new Error(`Play ${playId} not found`);
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.id, play.sessionId));
  if (!session) {
    throw new Error(`Session ${play.sessionId} not found`);
  }
  const clubId = session.clubId;
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  // Only one of these three tables ever has rows for a given play; deleting
  // from all three is a no-op on the other two, and simpler than branching
  // on the play's previous win condition to know which one to clear.
  await db.delete(leaderboardResults).where(eq(leaderboardResults.playId, playId));
  await db.delete(teamResults).where(eq(teamResults.playId, playId));
  await db.delete(outcomeResults).where(eq(outcomeResults.playId, playId));
  await db.update(plays).set({ gameId, notes }).where(eq(plays.id, playId));

  const rules = await resolveEffectiveRules(clubId, gameId);
  const checkedPlayers = parseCheckedPlayers(formData);
  await writeResultRows(playId, rules, checkedPlayers, formData);

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}
