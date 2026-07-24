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
  roleOneLabel: string | null;
  roleTwoLabel: string | null;
  neitherLabel: string | null;
};

export async function resolveEffectiveRules(
  clubId: string,
  gameId: string
): Promise<EffectiveRules> {
  const [variant] = await db
    .select({
      winCondition: clubGameVariants.winCondition,
      scoringDirection: clubGameVariants.scoringDirection,
      roleOneLabel: clubGameVariants.roleOneLabel,
      roleTwoLabel: clubGameVariants.roleTwoLabel,
      neitherLabel: clubGameVariants.neitherLabel,
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
      roleOneLabel: games.roleOneLabel,
      roleTwoLabel: games.roleTwoLabel,
      neitherLabel: games.neitherLabel,
    })
    .from(games)
    .where(eq(games.id, gameId));

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  return game;
}
