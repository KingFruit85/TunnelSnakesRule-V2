import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewSessionForm from "@/app/ui/clubs/NewSessionForm";

export default async function NewSessionPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) redirect("/clubs");

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="New session" />
      <NewSessionForm clubId={clubId} />
    </AppShell>
  );
}
