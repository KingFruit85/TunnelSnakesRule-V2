import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { getAllInactiveSessions } from "@/app/lib/db/sessions";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";

export default async function PreviousSessionsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [club, sessions] = await Promise.all([
    getClubDetails(clubId),
    getAllInactiveSessions(clubId),
  ]);
  const sorted = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Previous sessions" eyebrow={club.name} />
      <div className="border-t border-divider">
        {sorted.map((session) => (
          <Link
            key={session.id}
            href={`/clubs/${clubId}/sessions/${session.id}`}
            className="flex items-center gap-3 border-b border-divider px-5 py-[15px]"
          >
            <div className="flex-1">
              <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
              <p className="text-[12.5px] text-text opacity-60">
                {session.date.toLocaleDateString()} ·{" "}
                {session.winners.length} {session.winners.length === 1 ? "result" : "results"}
              </p>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
