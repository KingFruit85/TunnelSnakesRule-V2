"use server";
// src/app/lib/db/players-actions.ts
//
// Every Server Action for the players/club-membership domain. Split out of
// players.ts because Next.js requires Server Actions consumed by a Client
// Component to live in a file whose first line is this module-level
// "use server" directive - a per-function directive doesn't work once the
// sibling reads file (players.ts) is also reachable from client code via
// `import "server-only"`. This file must NOT `import "server-only"` itself;
// the "use server" directive already guarantees server-only execution, and
// mixing both is what caused the original break.
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { players, clubMembers, joinRequests, clubs } from "@/db/schema";
import { findPlayerByExternalId } from "./players";

export async function addNewPlayer(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const name = formData.get("playerName")?.toString();
  if (!name) {
    throw new Error("Missing player name");
  }

  const [existing] = await db.select().from(players).where(eq(players.name, name));
  if (existing) {
    throw new Error("User with that name already exists");
  }

  const [inserted] = await db
    .insert(players)
    .values({ externalId: uuidv4(), name })
    .returning();

  return inserted.id;
}

// addPlayerToClub/declineAccessRequest are called from clubAccessRequests.tsx
// with player.externalId (the Clerk id), matching today's real call site -
// so these resolve to the internal players.id themselves, in one place,
// rather than pushing that resolution onto every caller. Throws instead of
// tolerating a miss, unlike findPlayerByExternalId, since these three
// callers are mutations that can't proceed without a real player row.
async function resolvePlayerByExternalId(externalId: string) {
  const player = await findPlayerByExternalId(externalId);
  if (!player) {
    throw new Error(`Player with externalId ${externalId} not found`);
  }
  return player;
}

// addPlayerToClub/declineAccessRequest approve or decline someone else's
// join request, so only that club's owner may call them - checked directly
// against the clubs table here (not by importing clubs.ts's
// checkIfPlayerIsClubOwner, which would create a circular import, since
// clubs-actions.ts already imports addPlayerToClub from this file).
async function assertIsClubOwner(clubId: string, callerExternalId: string) {
  const caller = await findPlayerByExternalId(callerExternalId);
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  if (!caller || !club || club.ownerId !== caller.id) {
    throw new Error("Forbidden");
  }
}

export async function addPlayerToClub(playerExternalId: string, clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  await assertIsClubOwner(clubId, userId);
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db.insert(clubMembers).values({ playerId: player.id, clubId });
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath(`/clubs/${clubId}`);
}

export async function declineAccessRequest(playerExternalId: string, clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  await assertIsClubOwner(clubId, userId);
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath(`/clubs/${clubId}`);
}

export async function requestAccessToClub(clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const player = await resolvePlayerByExternalId(userId);
  await db.insert(joinRequests).values({ id: uuidv4(), playerId: player.id, clubId });
}
