// src/app/lib/db/games.ts
//
// Reads only. Mutations live in games-actions.ts - see the header comment
// in players.ts for why this split exists.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { BoardGame } from "@/app/lib/definitions";
import type { DbWinCondition, DbScoringDirection } from "./rules";

// Exported so games-actions.ts can reuse the same mapping tables rather
// than duplicating them (and risking the two copies drifting apart).
export const WIN_CONDITION_DB_TO_UI: Record<DbWinCondition, string> = {
  leaderboard: "0",
  team_based: "1",
  cooperative: "2",
  single_winner: "3",
  single_loser: "4",
  hidden_traitor: "5",
};

export const WIN_CONDITION_UI_TO_DB: Record<string, DbWinCondition> = {
  "0": "leaderboard",
  "1": "team_based",
  "2": "cooperative",
  "3": "single_winner",
  "4": "single_loser",
  "5": "hidden_traitor",
};

export const SCORING_DIRECTION_DB_TO_UI: Record<DbScoringDirection, string> = {
  high: "High",
  low: "Low",
};

export const SCORING_DIRECTION_UI_TO_DB: Record<string, DbScoringDirection> = {
  High: "high",
  Low: "low",
};

export async function getAllBoardgames(clubId: string): Promise<BoardGame[]> {
  const allGames = await db.select().from(games);
  const variants = await db
    .select()
    .from(clubGameVariants)
    .where(eq(clubGameVariants.clubId, clubId));

  const variantByGameId = new Map(variants.map((v) => [v.gameId, v]));

  return allGames.map((game) => {
    const variant = variantByGameId.get(game.id);
    const effective = variant ?? game;
    return {
      id: game.id,
      clubId,
      name: game.name,
      winCondition: WIN_CONDITION_DB_TO_UI[effective.winCondition],
      scoringDirection: effective.scoringDirection
        ? SCORING_DIRECTION_DB_TO_UI[effective.scoringDirection]
        : "",
      hasVariant: Boolean(variant),
      roleOneLabel: effective.roleOneLabel,
      roleTwoLabel: effective.roleTwoLabel,
      neitherLabel: effective.neitherLabel,
    } as BoardGame;
  });
}

export async function getBoardgameById(id: string): Promise<BoardGame> {
  const [game] = await db.select().from(games).where(eq(games.id, id));
  if (!game) {
    throw new Error(`Game ${id} not found`);
  }
  return {
    id: game.id,
    clubId: "",
    name: game.name,
    winCondition: WIN_CONDITION_DB_TO_UI[game.winCondition],
    scoringDirection: game.scoringDirection
      ? SCORING_DIRECTION_DB_TO_UI[game.scoringDirection]
      : "",
    hasVariant: false,
    roleOneLabel: game.roleOneLabel,
    roleTwoLabel: game.roleTwoLabel,
    neitherLabel: game.neitherLabel,
  } as unknown as BoardGame;
}
