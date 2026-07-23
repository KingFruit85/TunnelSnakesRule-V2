// src/app/lib/db/stats.ts
//
// Reads only. Aggregates the per-club "Club stats" screen: total
// sessions/results, and a per-member wins/played leaderboard.
//
// Win attribution reuses the "won" boolean writeResultRows (in
// results-actions.ts) already writes for every non-leaderboard condition -
// team_based, cooperative, single_winner, and single_loser all store the
// correct per-player winner as teamResults.won / outcomeResults.won at
// write time. Only leaderboard_results has no "won" column, since the
// winner there depends on the game's scoring direction, so that's the one
// branch this function computes itself, via resolveEffectiveRules - the
// same source of truth writeResultRows used when the play was recorded.
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sessions,
  plays,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { resolveEffectiveRules } from "./rules";
import { getAllPlayersInClub } from "./sessions";

export type ClubStatsRow = {
  playerId: string;
  name: string;
  wins: number;
  played: number;
};

export type ClubStats = {
  sessionCount: number;
  resultCount: number;
  leaderboard: ClubStatsRow[];
};

export async function getClubStats(clubId: string): Promise<ClubStats> {
  const clubSessions = await db.select().from(sessions).where(eq(sessions.clubId, clubId));
  const sessionIds = clubSessions.map((s) => s.id);

  const members = await getAllPlayersInClub(clubId);
  const tally = new Map<string, ClubStatsRow>(
    members.map((m) => [m.id, { playerId: m.id, name: m.name, wins: 0, played: 0 }])
  );

  if (sessionIds.length === 0) {
    return { sessionCount: 0, resultCount: 0, leaderboard: [] };
  }

  const sessionPlays = await db.select().from(plays).where(inArray(plays.sessionId, sessionIds));

  for (const play of sessionPlays) {
    const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
      db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
      db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
      db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
    ]);

    const participantIds = [
      ...leaderboardRows.map((r) => r.playerId),
      ...teamRows.map((r) => r.playerId),
      ...outcomeRows.map((r) => r.playerId),
    ];
    for (const id of participantIds) {
      const row = tally.get(id);
      if (row) row.played += 1;
    }

    let winnerIds: string[];
    if (leaderboardRows.length > 0) {
      const rules = await resolveEffectiveRules(clubId, play.gameId);
      const highScoreWins = rules.scoringDirection !== "low";
      const best = leaderboardRows.reduce((acc, row) =>
        highScoreWins ? (row.score > acc.score ? row : acc) : (row.score < acc.score ? row : acc)
      );
      winnerIds = [best.playerId];
    } else if (teamRows.length > 0) {
      winnerIds = teamRows.filter((r) => r.won).map((r) => r.playerId);
    } else {
      winnerIds = outcomeRows.filter((r) => r.won).map((r) => r.playerId);
    }
    for (const id of winnerIds) {
      const row = tally.get(id);
      if (row) row.wins += 1;
    }
  }

  const leaderboard = [...tally.values()]
    .filter((row) => row.played > 0)
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  return {
    sessionCount: clubSessions.length,
    resultCount: sessionPlays.length,
    leaderboard,
  };
}
