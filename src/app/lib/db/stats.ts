// src/app/lib/db/stats.ts
//
// Reads only. Aggregates the per-club "Club stats" screen: total
// sessions/plays, and a per-member wins/played leaderboard.
//
// Win attribution reuses the "won" boolean writeResultRows (in
// results-actions.ts) already writes for every non-leaderboard condition -
// team_based, team_scored, hidden_traitor, cooperative, single_winner, and
// single_loser all store the correct per-player winner as teamResults.won /
// outcomeResults.won at write time. Only leaderboard_results has no "won"
// column, since the winner there depends on the game's scoring direction,
// so that's the one branch this function computes itself, via
// resolveEffectiveRules - the same source of truth writeResultRows used
// when the play was recorded.
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

type LeaderboardResultRow = typeof leaderboardResults.$inferSelect;
type TeamResultRow = typeof teamResults.$inferSelect;
type OutcomeResultRow = typeof outcomeResults.$inferSelect;
import { resolveEffectiveRules, type EffectiveRules } from "./rules";
import { getAllPlayersInClub } from "./sessions";

export type ClubStatsRow = {
  playerId: string;
  name: string;
  wins: number;
  played: number;
};

export type ClubStats = {
  sessionCount: number;
  playCount: number;
  leaderboard: ClubStatsRow[];
};

function groupByPlayId<T extends { playId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.playId);
    if (bucket) {
      bucket.push(row);
    } else {
      grouped.set(row.playId, [row]);
    }
  }
  return grouped;
}

export async function getClubStats(clubId: string): Promise<ClubStats> {
  const clubSessions = await db.select().from(sessions).where(eq(sessions.clubId, clubId));
  const sessionIds = clubSessions.map((s) => s.id);

  const members = await getAllPlayersInClub(clubId);
  const tally = new Map<string, ClubStatsRow>(
    members.map((m) => [m.id, { playerId: m.id, name: m.name, wins: 0, played: 0 }])
  );

  if (sessionIds.length === 0) {
    return { sessionCount: 0, playCount: 0, leaderboard: [] };
  }

  const sessionPlays = await db.select().from(plays).where(inArray(plays.sessionId, sessionIds));
  const playIds = sessionPlays.map((p) => p.id);

  // Batched, not N+1: one query per result table across every play id in
  // this club's entire history, rather than one query per play. Same
  // pattern as getAllPlayersBySessionId in sessions.ts.
  const [leaderboardByPlay, teamByPlay, outcomeByPlay]: [
    Map<string, LeaderboardResultRow[]>,
    Map<string, TeamResultRow[]>,
    Map<string, OutcomeResultRow[]>,
  ] =
    playIds.length === 0
      ? [new Map(), new Map(), new Map()]
      : await Promise.all([
          db
            .select()
            .from(leaderboardResults)
            .where(inArray(leaderboardResults.playId, playIds))
            .then(groupByPlayId),
          db
            .select()
            .from(teamResults)
            .where(inArray(teamResults.playId, playIds))
            .then(groupByPlayId),
          db
            .select()
            .from(outcomeResults)
            .where(inArray(outcomeResults.playId, playIds))
            .then(groupByPlayId),
        ]);

  // The same game can recur across many plays in a club's history - cache
  // resolveEffectiveRules per gameId so it's only resolved once per call
  // rather than once per play.
  const rulesByGameId = new Map<string, EffectiveRules>();
  async function getRules(gameId: string): Promise<EffectiveRules> {
    const cached = rulesByGameId.get(gameId);
    if (cached) return cached;
    const rules = await resolveEffectiveRules(clubId, gameId);
    rulesByGameId.set(gameId, rules);
    return rules;
  }

  for (const play of sessionPlays) {
    const leaderboardRows = leaderboardByPlay.get(play.id) ?? [];
    const teamRows = teamByPlay.get(play.id) ?? [];
    const outcomeRows = outcomeByPlay.get(play.id) ?? [];

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
      // NOTE: this deliberately resolves scoring direction via
      // resolveEffectiveRules (club-variant-aware), which can disagree with
      // results.ts's getEventWinner - that function reads games.scoringDirection
      // directly off the base game and ignores any clubGameVariants override.
      // getClubStats is intentionally more correct here; reconciling the two
      // is a known follow-up, out of scope for this task.
      const rules = await getRules(play.gameId);
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
    playCount: sessionPlays.length,
    leaderboard,
  };
}
