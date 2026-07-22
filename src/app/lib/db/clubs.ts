// src/app/lib/db/clubs.ts
import "server-only";
import { eq, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { clubs, clubMembers, players } from "@/db/schema";
import { Club } from "@/app/lib/definitions";
import { addPlayerToClub } from "./players";

function toClub(row: typeof clubs.$inferSelect): Club {
  return {
    id: row.id,
    name: row.name,
    createdDate: row.createdAt,
    owner: row.ownerId,
  };
}

export async function getClubDetails(id: string): Promise<Club> {
  if (!id) {
    redirect("/");
  }
  const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
  if (!club) {
    redirect("/");
  }
  return toClub(club);
}

// checkIfPlayerIsClubOwner / getClubsPlayerIsNotAMemberOf / getUsersClubs are
// all called from pages/components that only ever have a Clerk external id in
// scope (user.id from currentUser()/auth()), never an already-resolved
// internal player row - see sessions/page.tsx, userClubs.tsx, AvailableClubs.tsx
// in Task 8. Rather than pushing that resolution onto each call site (which
// would mean editing three more files beyond an import-path swap), each of
// these resolves the external id to the internal players.id itself, exactly
// like players.ts's addPlayerToClub/checkIfPlayerIsClubMember already do.
async function resolvePlayerIdByExternalId(externalId: string): Promise<string | null> {
  const [player] = await db.select().from(players).where(eq(players.externalId, externalId));
  return player?.id ?? null;
}

export async function checkIfPlayerIsClubOwner(clubId: string, playerExternalId: string) {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return false;
  }
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  return club?.ownerId === playerId;
}

export async function getClubsPlayerIsNotAMemberOf(playerExternalId: string): Promise<Club[]> {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return db.select().from(clubs).then((rows) => rows.map(toClub));
  }

  const memberships = await db
    .select({ clubId: clubMembers.clubId })
    .from(clubMembers)
    .where(eq(clubMembers.playerId, playerId));

  const memberClubIds = memberships.map((m) => m.clubId);

  const rows =
    memberClubIds.length > 0
      ? await db.select().from(clubs).where(notInArray(clubs.id, memberClubIds))
      : await db.select().from(clubs);

  return rows.map(toClub);
}

export async function getUsersClubs(playerExternalId: string): Promise<Club[]> {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return [];
  }

  const rows = await db
    .select({ club: clubs })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.playerId, playerId));

  return rows.map((row) => toClub(row.club));
}

export async function addNewClub(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("clubName")?.toString();
  if (!name) {
    throw new Error("Missing required fields");
  }

  const [owner] = await db.select().from(players).where(eq(players.externalId, userId));
  if (!owner) {
    throw new Error("Player does not exist");
  }

  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId: owner.id })
    .returning();

  await addPlayerToClub(owner.externalId, insertedClub.id);

  revalidatePath("/join/club");
  redirect("/");
}
