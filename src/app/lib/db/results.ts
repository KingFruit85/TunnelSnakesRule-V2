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
