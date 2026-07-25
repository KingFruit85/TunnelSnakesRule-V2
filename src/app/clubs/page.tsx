import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronRight } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import ThemeToggle from "@/app/ui/ds/ThemeToggle";
import IconButton from "@/app/ui/ds/IconButton";
import LinkButton from "@/app/ui/ds/LinkButton";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import EmptyState from "@/app/ui/ds/EmptyState";
import { ROW_TINT_CLASS } from "@/app/ui/ds/tint";

export default async function ClubsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clubs = await getUsersClubs(userId);
  const rows = await Promise.all(
    clubs.map(async (club) => {
      const [members, games] = await Promise.all([
        getAllPlayersInClub(club.id),
        getAllBoardgames(club.id),
      ]);
      return { club, memberCount: members.length, gameCount: games.length };
    })
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">
            Board game clubs
          </p>
          <h1 className="text-[30px] font-bold text-text">Clubs</h1>
        </div>
        <div className="flex items-center gap-1">
          <SignOutButton redirectUrl="/">
            <IconButton aria-label="Log out">
              <LogOut size={20} strokeWidth={2} />
            </IconButton>
          </SignOutButton>
          <ThemeToggle />
        </div>
      </div>

      <div className="flex gap-2 px-5 pt-4">
        <LinkButton href="/clubs/new" block>
          + New club
        </LinkButton>
        <LinkButton href="/join/club" variant="secondary" block>
          Join a club
        </LinkButton>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState
            title="No clubs yet"
            helper="Create a club to start logging sessions."
            action={
              <LinkButton href="/clubs/new" variant="primary">
                Create a club
              </LinkButton>
            }
          />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ club, memberCount, gameCount }) => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className={`flex items-center gap-3 border-b border-divider px-5 py-[18px] ${ROW_TINT_CLASS}`}
              >
                <InitialSquare label={club.name} size={44} />
                <div className="flex-1">
                  <p className="text-[17px] font-semibold text-text">{club.name}</p>
                  <p className="text-[12.5px] text-text opacity-60">
                    {memberCount} {memberCount === 1 ? "member" : "members"} · {gameCount}{" "}
                    {gameCount === 1 ? "game" : "games"}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={2} className="text-text opacity-45" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
