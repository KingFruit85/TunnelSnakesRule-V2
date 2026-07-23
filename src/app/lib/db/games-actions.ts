"use server";
// src/app/lib/db/games-actions.ts
//
// Every Server Action for the games/catalog domain. Split out of games.ts -
// see the header comment in players.ts for why. Must NOT `import "server-only"`.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { WIN_CONDITION_UI_TO_DB, SCORING_DIRECTION_UI_TO_DB } from "./games";

export async function addNewBoardGame(formData: FormData) {
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
