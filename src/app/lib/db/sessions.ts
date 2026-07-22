// src/app/lib/db/sessions.ts
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import {
  sessions,
  plays,
  clubMembers,
  players,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { GameSession, Player } from "@/app/lib/definitions";
import { getEventWinner, getPlayResultsForPlay } from "./results";
import { checkIfPlayerIsClubMember } from "./players";

async function assertIsClubMember(clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }
}

function toPlayer(row: typeof players.$inferSelect): Player {
  return { id: row.id, externalId: row.externalId, name: row.name, avatar: row.avatar ?? "" };
}

/** Record-time roster: every club member, every time. */
export async function getAllPlayersInClub(clubId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(clubMembers)
    .innerJoin(players, eq(clubMembers.playerId, players.id))
    .where(eq(clubMembers.clubId, clubId));

  return rows.map((row) => toPlayer(row.player));
}

/** Historical roster: derived from every result table via this session's plays. */
export async function getAllPlayersBySessionId(sessionId: string): Promise<Player[]> {
  const sessionPlays = await db
    .select({ id: plays.id })
    .from(plays)
    .where(eq(plays.sessionId, sessionId));

  const playIds = sessionPlays.map((p) => p.id);
  if (playIds.length === 0) {
    return [];
  }

  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select({ playerId: leaderboardResults.playerId }).from(leaderboardResults).where(inArray(leaderboardResults.playId, playIds)),
    db.select({ playerId: teamResults.playerId }).from(teamResults).where(inArray(teamResults.playId, playIds)),
    db.select({ playerId: outcomeResults.playerId }).from(outcomeResults).where(inArray(outcomeResults.playId, playIds)),
  ]);

  const playerIds = [
    ...new Set([...leaderboardRows, ...teamRows, ...outcomeRows].map((r) => r.playerId)),
  ];
  if (playerIds.length === 0) {
    return [];
  }

  const rows = await db.select().from(players).where(inArray(players.id, playerIds));
  return rows.map(toPlayer);
}

export async function getAllClubSessionNames(clubId: string): Promise<string[]> {
  const rows = await db
    .select({ name: sessions.name })
    .from(sessions)
    .where(eq(sessions.clubId, clubId));
  return rows.map((row) => row.name ?? "");
}

async function toGameSession(row: typeof sessions.$inferSelect): Promise<GameSession> {
  const sessionPlays = await db.select().from(plays).where(eq(plays.sessionId, row.id));
  const playerResults = (await Promise.all(sessionPlays.map((p) => getPlayResultsForPlay(p)))).flat();
  const winners = await Promise.all(sessionPlays.map((p) => getEventWinner(p.id)));
  const imageUrls = row.imageUrls as string[] | null;

  return {
    id: row.id,
    name: row.name ?? "",
    date: row.date,
    active: row.active,
    playerIds: [...new Set(playerResults.map((r) => r.playerId))],
    playerResults,
    notes: row.notes ?? undefined,
    imageurl: imageUrls ? JSON.stringify(imageUrls) : "",
    winners,
  };
}

export async function getAllActiveSessionDetails(clubId: string): Promise<GameSession[]> {
  if (!clubId) {
    redirect("/");
  }
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.active, true), eq(sessions.clubId, clubId)));
  return Promise.all(rows.map(toGameSession));
}

export async function getAllInactiveSessions(clubId: string): Promise<GameSession[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.active, false), eq(sessions.clubId, clubId)));
  return Promise.all(rows.map(toGameSession));
}

export async function getSessionDetails(id: string): Promise<GameSession[]> {
  const rows = await db.select().from(sessions).where(eq(sessions.id, id));
  return Promise.all(rows.map(toGameSession));
}

export async function addNewGameSession(formData: FormData) {
  "use server";
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  if (!sessionName || !clubId) {
    throw new Error("Missing required fields");
  }
  await assertIsClubMember(clubId);

  await db.insert(sessions).values({
    id: uuidv4(),
    clubId,
    name: sessionName,
    date: new Date(),
    active: true,
  });

  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
}

export async function endSession(id: string, notes: string) {
  "use server";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) {
    throw new Error(`Session ${id} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ active: false, notes }).where(eq(sessions.id, id));
  revalidatePath("/sessions");
}

export async function addImageToSession(blobUri: string, sessionId: string, clubId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  const currentImages = (session?.imageUrls as string[] | null) ?? [];
  const updatedImages = [...currentImages, blobUri];

  await db.update(sessions).set({ imageUrls: updatedImages }).where(eq(sessions.id, sessionId));

  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
}

export const redirectBackToSessions = async (clubId: string) => {
  "use server";
  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
};
