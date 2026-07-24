// src/app/clubs/[clubId]/sessions/[sessionId]/results/[playId]/edit/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember, getPlayersByIds } from "@/app/lib/db/players";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getPlayForEdit } from "@/app/lib/db/results";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import ResultForm from "@/app/ui/clubs/ResultForm";

export default async function EditResultPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string; playId: string }>;
}) {
  const { clubId, sessionId, playId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) redirect("/clubs");

  const [club, members, games, editData] = await Promise.all([
    getClubDetails(clubId),
    getAllPlayersInClub(clubId),
    getAllBoardgames(clubId),
    getPlayForEdit(clubId, playId),
  ]);

  if (!editData) {
    redirect(`/clubs/${clubId}/sessions/${sessionId}`);
  }

  // The play's participants may include players who were club members when
  // this play was recorded but have since left (or aren't in the current
  // roster for some other reason). Union current members with those
  // historical participants so the form can still display/re-submit them.
  const currentMemberIds = new Set(members.map((m) => m.id));
  const missingIds = editData.participantIds.filter((id) => !currentMemberIds.has(id));
  const historicalMembers = missingIds.length > 0 ? await getPlayersByIds(missingIds) : [];
  const allMembers = [...members, ...historicalMembers];

  return (
    <AppShell>
      <BackHeader
        href={`/clubs/${clubId}/sessions/${sessionId}`}
        title="Edit result"
        eyebrow={club.name}
      />
      <ResultForm
        mode="edit"
        sessionId={sessionId}
        clubId={clubId}
        playId={playId}
        games={games}
        members={allMembers}
        initialData={editData}
      />
    </AppShell>
  );
}
