"use server";
// src/app/lib/db/sessions-actions.ts
//
// Every Server Action for the sessions domain. Split out of sessions.ts -
// see the header comment in players.ts for why. Must NOT `import "server-only"`.
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
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

export async function addNewGameSession(formData: FormData) {
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  if (!sessionName || !clubId) {
    throw new Error("Missing required fields");
  }
  await assertIsClubMember(clubId);

  const [inserted] = await db
    .insert(sessions)
    .values({
      id: uuidv4(),
      clubId,
      name: sessionName,
      date: new Date(),
      active: true,
    })
    .returning();

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/sessions");
  redirect(`/clubs/${clubId}/sessions/${inserted.id}`);
}

export async function endSession(id: string, notes: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) {
    throw new Error(`Session ${id} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ active: false, notes }).where(eq(sessions.id, id));
  revalidatePath("/sessions");
}

export async function reopenSession(id: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) {
    throw new Error(`Session ${id} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ active: true }).where(eq(sessions.id, id));
  revalidatePath("/sessions");
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ notes }).where(eq(sessions.id, sessionId));
  revalidatePath(`/clubs/${session.clubId}/sessions/${sessionId}`);
}

export const redirectBackToSessions = async (clubId: string) => {
  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
};
