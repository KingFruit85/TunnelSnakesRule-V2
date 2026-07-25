"use server";
// src/app/lib/db/clubs-actions.ts
//
// Every Server Action for the clubs domain. Split out of clubs.ts - see the
// header comment in players.ts for why. Must NOT `import "server-only"`.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { clubs } from "@/db/schema";
import { ensurePlayerProfile } from "./players";
import { addPlayerToClub } from "./players-actions";

export async function addNewClub(formData: FormData) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("clubName")?.toString();
  if (!name) {
    throw new Error("Missing required fields");
  }

  // Own profile, not someone else's - self-heal rather than throw, since
  // the caller may never have rendered "/" (see ensurePlayerProfile).
  const owner = await ensurePlayerProfile(user);

  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId: owner.id })
    .returning();

  await addPlayerToClub(user.id, insertedClub.id);

  revalidatePath("/join/club");
  revalidatePath("/clubs");
  redirect(`/clubs/${insertedClub.id}`);
}
