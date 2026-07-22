// src/app/lib/db/games.ts
import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { BoardGame } from "@/app/lib/definitions";
import type { DbWinCondition, DbScoringDirection } from "./rules";

const WIN_CONDITION_DB_TO_UI: Record<DbWinCondition, string> = {
  leaderboard: "0",
  team_based: "1",
  cooperative: "2",
  single_winner: "3",
  single_loser: "4",
};

const WIN_CONDITION_UI_TO_DB: Record<string, DbWinCondition> = {
  "0": "leaderboard",
  "1": "team_based",
  "2": "cooperative",
  "3": "single_winner",
  "4": "single_loser",
};

const SCORING_DIRECTION_DB_TO_UI: Record<DbScoringDirection, string> = {
  high: "High",
  low: "Low",
};

const SCORING_DIRECTION_UI_TO_DB: Record<string, DbScoringDirection> = {
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
  } as unknown as BoardGame;
}

export async function addNewBoardGame(formData: FormData) {
  "use server";
  const name = formData.get("gameName")?.toString();
  const winConditionUi = formData.get("winCondition")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const scoringDirectionUi = formData.get("scoringDirection")?.toString();

  if (!name || !winConditionUi || !clubId) {
    throw new Error("Missing required fields");
  }

  const winCondition = WIN_CONDITION_UI_TO_DB[winConditionUi];
  const scoringDirection = scoringDirectionUi
    ? SCORING_DIRECTION_UI_TO_DB[scoringDirectionUi]
    : null;

  const [existingGame] = await db.select().from(games).where(eq(games.name, name));

  if (!existingGame) {
    await db.insert(games).values({ id: uuidv4(), name, winCondition, scoringDirection });
  } else if (
    existingGame.winCondition !== winCondition ||
    existingGame.scoringDirection !== scoringDirection
  ) {
    await db
      .insert(clubGameVariants)
      .values({ clubId, gameId: existingGame.id, winCondition, scoringDirection })
      .onConflictDoUpdate({
        target: [clubGameVariants.clubId, clubGameVariants.gameId],
        set: { winCondition, scoringDirection },
      });
  }

  redirect(`/sessions?clubId=${clubId}`);
}
