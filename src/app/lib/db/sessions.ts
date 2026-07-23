// src/app/lib/db/sessions.ts
//
// Reads only, plus addImageToSession (a write, but never called from
// client-reachable code - only api/session/upload/route.ts, a Route
// Handler, so it doesn't need "use server" and can stay here). Every
// Server Action reachable from a "use client" component lives in
// sessions-actions.ts instead - see the header comment in players.ts for
// why this split exists.
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function addImageToSession(blobUri: string, sessionId: string, clubId: string) {
  // Constrained by clubId as well as sessionId: the caller (api/session/upload/route.ts)
  // checks membership against the clubId it was handed, which is a separate value from
  // sessionId in the same client payload - without this, a member of one club could
  // attach an image to a different club's session by pairing their own clubId with
  // someone else's sessionId. Scoping the read+update to both together makes a
  // mismatched pair a no-op instead of a cross-tenant write.
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));
  if (!session) {
    throw new Error(`Session ${sessionId} not found in club ${clubId}`);
  }
  const currentImages = (session.imageUrls as string[] | null) ?? [];
  const updatedImages = [...currentImages, blobUri];

  await db
    .update(sessions)
    .set({ imageUrls: updatedImages })
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));

  revalidatePath(`/clubs/${clubId}/sessions/${sessionId}`);
}
