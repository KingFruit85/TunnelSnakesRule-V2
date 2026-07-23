import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllActiveSessionDetails, getAllInactiveSessions } from "@/app/lib/db/sessions";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import Tag from "@/app/ui/ds/Tag";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function SessionsTabPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const clubs = await getUsersClubs(user.id);
  const perClub = await Promise.all(
    clubs.map(async (club) => {
      const [active, previous] = await Promise.all([
        getAllActiveSessionDetails(club.id),
        getAllInactiveSessions(club.id),
      ]);
      return [...active, ...previous].map((session) => ({ session, club }));
    })
  );
  const rows = perClub.flat().sort((a, b) => b.session.date.getTime() - a.session.date.getTime());

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Sessions</h1>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="No sessions yet" helper="Sessions you record will show up here." />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ session, club }) => (
              <Link
                key={session.id}
                href={`/clubs/${club.id}/sessions/${session.id}`}
                className="flex items-center gap-3 border-b border-divider px-5 py-[15px]"
              >
                <div className="flex-1">
                  <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
                  <p className="text-[12.5px] text-text opacity-60">
                    {club.name} · {session.date.toLocaleDateString()} · {session.winners.length}{" "}
                    {session.winners.length === 1 ? "result" : "results"}
                  </p>
                </div>
                {session.active && <Tag variant="accent">Active</Tag>}
                <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
