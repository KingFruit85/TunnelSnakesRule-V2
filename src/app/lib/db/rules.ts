// src/app/lib/db/rules.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubGameVariants, games, winConditionEnum, scoringDirectionEnum } from "@/db/schema";

export type DbWinCondition = (typeof winConditionEnum.enumValues)[number];
export type DbScoringDirection = (typeof scoringDirectionEnum.enumValues)[number];

export type EffectiveRules = {
  winCondition: DbWinCondition;
  scoringDirection: DbScoringDirection | null;
};

export async function resolveEffectiveRules(
  clubId: string,
  gameId: string
): Promise<EffectiveRules> {
  const [variant] = await db
    .select({
      winCondition: clubGameVariants.winCondition,
      scoringDirection: clubGameVariants.scoringDirection,
    })
    .from(clubGameVariants)
    .where(and(eq(clubGameVariants.clubId, clubId), eq(clubGameVariants.gameId, gameId)));

  if (variant) {
    return variant;
  }

  const [game] = await db
    .select({
      winCondition: games.winCondition,
      scoringDirection: games.scoringDirection,
    })
    .from(games)
    .where(eq(games.id, gameId));

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  return game;
}
