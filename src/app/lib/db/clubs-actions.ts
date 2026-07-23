"use server";
// src/app/lib/db/clubs-actions.ts
//
// Every Server Action for the clubs domain. Split out of clubs.ts - see the
// header comment in players.ts for why. Must NOT `import "server-only"`.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { clubs } from "@/db/schema";
import { resolvePlayerIdByExternalId } from "./clubs";
import { addPlayerToClub } from "./players-actions";

export async function addNewClub(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("clubName")?.toString();
  if (!name) {
    throw new Error("Missing required fields");
  }

  const ownerId = await resolvePlayerIdByExternalId(userId);
  if (!ownerId) {
    throw new Error("Player does not exist");
  }

  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId })
    .returning();

  await addPlayerToClub(userId, insertedClub.id);

  revalidatePath("/join/club");
  revalidatePath("/clubs");
  redirect(`/clubs/${insertedClub.id}`);
}
