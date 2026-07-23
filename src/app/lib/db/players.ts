// src/app/lib/db/players.ts
//
// Reads only. Mutations live in players-actions.ts - Next.js requires
// Server Actions consumed by a Client Component to come from a file whose
// FIRST LINE is a module-level "use server" directive, not mixed into a
// file that also `import "server-only"`s and is reachable from client code.
// (Discovered the hard way: a per-function "use server" inside a file that
// also has `import "server-only"` and gets imported - even just for a type
// or an unrelated read - by any "use client" component breaks the build.)
import "server-only";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { players, clubMembers, joinRequests } from "@/db/schema";
import { Player } from "@/app/lib/definitions";
import type { User } from "@clerk/nextjs/server";

function toPlayer(row: typeof players.$inferSelect): Player {
  return {
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    avatar: row.avatar ?? "",
  };
}

export async function getPlayerById(id: string): Promise<Player> {
  const [row] = await db.select().from(players).where(eq(players.id, id));
  if (!row) {
    throw new Error(`Player ${id} not found`);
  }
  return toPlayer(row);
}

export async function getPlayerByExternalId(externalId: string): Promise<Player> {
  const [row] = await db.select().from(players).where(eq(players.externalId, externalId));
  if (!row) {
    throw new Error(`Player with externalId ${externalId} not found`);
  }
  return toPlayer(row);
}

export async function checkIfUserHasPlayerProfile(externalId: string) {
  const [row] = await db.select().from(players).where(eq(players.externalId, externalId));
  return Boolean(row);
}

export async function createNewPlayerRecord(user: User) {
  await db.insert(players).values({
    externalId: user.id,
    name: user.firstName ?? "",
    avatar: user.imageUrl,
  });
}

export async function addImageToPlayer(blobUri: string, playerId: string) {
  await db.update(players).set({ avatar: blobUri }).where(eq(players.id, playerId));
  revalidatePath("/players");
}

// Shared by every function below (and by players-actions.ts) that's handed
// a Clerk external id instead of the internal players.id - one query,
// tolerant of a miss (returns undefined) rather than throwing, since reads
// generally want "not found" to mean false/empty, not an error.
export async function findPlayerByExternalId(externalId: string) {
  const [player] = await db.select().from(players).where(eq(players.externalId, externalId));
  return player;
}

// Called from api/session/upload/route.ts with the Clerk external id
// (tp.userId from auth()), not the internal players.id - resolve it here,
// tolerating an unknown external id as "not a member" rather than throwing.
export async function checkIfPlayerIsClubMember(playerExternalId: string, clubId: string) {
  const player = await findPlayerByExternalId(playerExternalId);
  if (!player) {
    return false;
  }
  const [row] = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.playerId, player.id), eq(clubMembers.clubId, clubId)));
  return Boolean(row);
}

// Called from AvailableClubs.tsx with the Clerk external id (see Task 8) -
// same resolve-internally rule as the rest of this file's membership checks.
export async function checkAccessRequestStatus(playerExternalId: string, clubId: string) {
  const player = await findPlayerByExternalId(playerExternalId);
  if (!player) {
    return false;
  }
  const [row] = await db
    .select()
    .from(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  return Boolean(row);
}

export async function checkForOutstandingClubAccessRequests(clubId: string) {
  const rows = await db.select().from(joinRequests).where(eq(joinRequests.clubId, clubId));
  return rows.length > 0;
}

export async function getAllAcessRequests(clubId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(joinRequests)
    .innerJoin(players, eq(joinRequests.playerId, players.id))
    .where(eq(joinRequests.clubId, clubId));

  return rows.map((row) => toPlayer(row.player));
}
