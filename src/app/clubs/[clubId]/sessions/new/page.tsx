import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewSessionForm from "@/app/ui/clubs/NewSessionForm";

export default async function NewSessionPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="New session" />
      <NewSessionForm clubId={clubId} />
    </AppShell>
  );
}
