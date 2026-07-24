// src/app/clubs/[clubId]/sessions/[sessionId]/results/new/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import ResultForm from "@/app/ui/clubs/ResultForm";

export default async function NewResultPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) redirect("/clubs");

  const [club, members, games] = await Promise.all([
    getClubDetails(clubId),
    getAllPlayersInClub(clubId),
    getAllBoardgames(clubId),
  ]);

  if (games.length === 0) {
    redirect(`/clubs/${clubId}/sessions/${sessionId}`);
  }

  return (
    <AppShell>
      <BackHeader
        href={`/clubs/${clubId}/sessions/${sessionId}`}
        title="Add result"
        eyebrow={club.name}
      />
      <ResultForm
        mode="add"
        sessionId={sessionId}
        clubId={clubId}
        games={games}
        members={members}
        initialData={null}
      />
    </AppShell>
  );
}
