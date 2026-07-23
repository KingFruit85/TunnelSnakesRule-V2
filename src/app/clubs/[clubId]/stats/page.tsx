import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";

export default async function ClubStatsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const club = await getClubDetails(clubId);

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Club stats" eyebrow={club.name} />
      <div className="flex flex-1 items-center justify-center px-5 text-center">
        <p className="text-[14px] text-text opacity-60">
          Full stats are coming soon — session and results totals are already tracked behind the
          scenes, this screen just isn&apos;t built yet.
        </p>
      </div>
    </AppShell>
  );
}
