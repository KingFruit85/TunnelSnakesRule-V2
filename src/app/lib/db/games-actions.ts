"use server";
// src/app/lib/db/games-actions.ts
//
// Every Server Action for the games/catalog domain. Split out of games.ts -
// see the header comment in players.ts for why. Must NOT `import "server-only"`.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { WIN_CONDITION_UI_TO_DB, SCORING_DIRECTION_UI_TO_DB } from "./games";
import { checkIfPlayerIsClubMember } from "./players";

export async function addNewBoardGame(formData: FormData) {
  const name = formData.get("gameName")?.toString();
  const winConditionUi = formData.get("winCondition")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const scoringDirectionUi = formData.get("scoringDirection")?.toString();
  const roleOneLabel = formData.get("roleOneLabel")?.toString().trim() || null;
  const roleTwoLabel = formData.get("roleTwoLabel")?.toString().trim() || null;
  const neitherLabel = formData.get("neitherLabel")?.toString().trim() || null;

  if (!name || !winConditionUi || !clubId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  const winCondition = WIN_CONDITION_UI_TO_DB[winConditionUi];
  const scoringDirection = scoringDirectionUi
    ? SCORING_DIRECTION_UI_TO_DB[scoringDirectionUi]
    : null;

  if (winCondition === "hidden_traitor") {
    if (!roleOneLabel || !roleTwoLabel || !neitherLabel) {
      throw new Error("Hidden traitor games require role one, role two, and neither-wins labels");
    }
    const labels = [roleOneLabel, roleTwoLabel, neitherLabel];
    if (new Set(labels).size !== labels.length) {
      throw new Error("Hidden traitor labels must be distinct");
    }
  }

  const ruleFields = {
    winCondition,
    scoringDirection,
    roleOneLabel: winCondition === "hidden_traitor" ? roleOneLabel : null,
    roleTwoLabel: winCondition === "hidden_traitor" ? roleTwoLabel : null,
    neitherLabel: winCondition === "hidden_traitor" ? neitherLabel : null,
  };

  const [existingGame] = await db.select().from(games).where(eq(games.name, name));

  if (!existingGame) {
    await db.insert(games).values({ id: uuidv4(), name, ...ruleFields });
  } else if (
    existingGame.winCondition !== ruleFields.winCondition ||
    existingGame.scoringDirection !== ruleFields.scoringDirection ||
    existingGame.roleOneLabel !== ruleFields.roleOneLabel ||
    existingGame.roleTwoLabel !== ruleFields.roleTwoLabel ||
    existingGame.neitherLabel !== ruleFields.neitherLabel
  ) {
    await db
      .insert(clubGameVariants)
      .values({ clubId, gameId: existingGame.id, ...ruleFields })
      .onConflictDoUpdate({
        target: [clubGameVariants.clubId, clubGameVariants.gameId],
        set: ruleFields,
      });
  }

  redirect(`/clubs/${clubId}`);
}
