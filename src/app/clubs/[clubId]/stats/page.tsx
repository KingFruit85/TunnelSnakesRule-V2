import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getClubStats } from "@/app/lib/db/stats";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function ClubStatsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) redirect("/clubs");

  const [club, stats] = await Promise.all([getClubDetails(clubId), getClubStats(clubId)]);

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Club stats" eyebrow={club.name} />

      <div className="grid grid-cols-2 border-b-2 border-divider">
        <div className="border-r border-divider px-5 py-4">
          <p className="text-[28px] font-bold text-text">{stats.sessionCount}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">Sessions</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[28px] font-bold text-text">{stats.playCount}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">Results logged</p>
        </div>
      </div>

      <div className="flex-1">
        {stats.leaderboard.length === 0 ? (
          <EmptyState title="No results logged yet" helper="Stats will appear after the first game." />
        ) : (
          <div>
            <p className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
              Most wins
            </p>
            {stats.leaderboard.map((row, i) => (
              <div key={row.playerId} className="flex items-center gap-3 border-b border-divider px-5 py-3">
                <span className="w-4 text-[13px] text-text opacity-45">{i + 1}</span>
                <InitialSquare label={row.name} size={38} variant="accentTint" />
                <div className="flex-1">
                  <p className="text-[15px] text-text">{row.name}</p>
                  <p className="text-[12px] text-text opacity-55">
                    {row.played} {row.played === 1 ? "game played" : "games played"}
                  </p>
                </div>
                <span className="text-[17px] font-bold text-accent-700">{row.wins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
