// src/app/lib/db/players.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { players, clubMembers, joinRequests, clubs } from "@/db/schema";
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

export async function addNewPlayer(formData: FormData) {
  "use server";
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

export async function addImageToPlayer(blobUri: string, playerId: string) {
  await db.update(players).set({ avatar: blobUri }).where(eq(players.id, playerId));
  revalidatePath("/players");
}

// Shared by every function below that's handed a Clerk external id instead
// of the internal players.id - one query, two error-handling wrappers
// (tolerant vs. throwing), rather than each caller inlining its own copy.
async function findPlayerByExternalId(externalId: string) {
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

// addPlayerToClub/declineAccessRequest are called from clubAccessRequests.tsx
// with player.externalId (the Clerk id), matching today's real call site -
// so these resolve to the internal players.id themselves, in one place,
// rather than pushing that resolution onto every caller. Throws instead of
// tolerating a miss, unlike findPlayerByExternalId above, since these three
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
// clubs.ts already imports addPlayerToClub from this file).
async function assertIsClubOwner(clubId: string, callerExternalId: string) {
  const caller = await findPlayerByExternalId(callerExternalId);
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  if (!caller || !club || club.ownerId !== caller.id) {
    throw new Error("Forbidden");
  }
}

export async function addPlayerToClub(playerExternalId: string, clubId: string) {
  "use server";
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
  revalidatePath("/requests");
}

export async function declineAccessRequest(playerExternalId: string, clubId: string) {
  "use server";
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  await assertIsClubOwner(clubId, userId);
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath("/requests");
}

export async function requestAccessToClub(clubId: string) {
  "use server";
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const player = await resolvePlayerByExternalId(userId);
  await db.insert(joinRequests).values({ id: uuidv4(), playerId: player.id, clubId });
}
