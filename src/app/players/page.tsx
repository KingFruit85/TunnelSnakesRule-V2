import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Tag from "@/app/ui/ds/Tag";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function PlayersTabPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clubs = await getUsersClubs(userId);
  const perClub = await Promise.all(
    clubs.map(async (club) => {
      const members = await getAllPlayersInClub(club.id);
      return members.map((player) => ({ player, club }));
    })
  );
  const rows = perClub.flat();

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Players</h1>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="No players yet" helper="Players will show up here once your clubs have members." />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ player, club }) => (
              <div
                key={`${club.id}-${player.id}`}
                className="flex items-center gap-3 border-b border-divider px-5 py-3"
              >
                <InitialSquare label={player.name} size={38} variant="accentTint" />
                <span className="flex-1 text-[15px] text-text">{player.name}</span>
                <Tag variant="neutral">{club.name}</Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
