import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import AddGameForm from "@/app/ui/clubs/AddGameForm";

export default async function AddGamePage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) redirect("/clubs");

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Add game" />
      <AddGameForm clubId={clubId} />
    </AppShell>
  );
}
