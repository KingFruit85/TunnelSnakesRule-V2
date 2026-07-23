import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, BarChart, History } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { getAllPlayersInClub, getAllActiveSessionDetails, getAllInactiveSessions } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getAllAcessRequests } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Tag from "@/app/ui/ds/Tag";
import LinkButton from "@/app/ui/ds/LinkButton";
import JoinRequestRow from "@/app/ui/clubs/JoinRequestRow";

export default async function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const [club, members, games, activeSessions, previousSessions, requests] = await Promise.all([
    getClubDetails(clubId),
    getAllPlayersInClub(clubId),
    getAllBoardgames(clubId),
    getAllActiveSessionDetails(clubId),
    getAllInactiveSessions(clubId),
    getAllAcessRequests(clubId),
  ]);
  const totalSessions = activeSessions.length + previousSessions.length;

  return (
    <AppShell>
      <BackHeader href="/clubs" title={club.name} />

      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <InitialSquare label={club.name} size={56} />
          <div>
            <p className="text-[26px] font-bold leading-tight text-text">{club.name}</p>
            <p className="text-[12.5px] text-text opacity-60">
              {members.length} {members.length === 1 ? "member" : "members"} · {games.length}{" "}
              {games.length === 1 ? "game" : "games"} · {totalSessions}{" "}
              {totalSessions === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>
        <LinkButton href={`/clubs/${clubId}/stats`} variant="secondary" compact>
          <span className="flex items-center gap-1.5">
            <BarChart size={14} strokeWidth={2} />
            Stats
          </span>
        </LinkButton>
      </div>

      <SectionHeader
        label="Sessions"
        action={
          <LinkButton href={`/clubs/${clubId}/sessions/new`} variant="secondary" compact>
            New session
          </LinkButton>
        }
      />
      {activeSessions.length === 0 ? (
        <p className="px-5 pb-2 text-[14px] text-text opacity-60">No active sessions.</p>
      ) : (
        <div className="border-t border-divider">
          {activeSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/previousSession?sessionId=${session.id}&clubId=${clubId}`}
              className="flex items-center gap-3 border-b border-divider px-5 py-3"
            >
              <div className="flex-1">
                <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
                <p className="text-[12.5px] text-text opacity-60">
                  {session.date.toLocaleDateString()} · {session.winners.length}{" "}
                  {session.winners.length === 1 ? "result" : "results"}
                </p>
              </div>
              <Tag variant="accent">Active</Tag>
              <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
            </Link>
          ))}
        </div>
      )}
      {previousSessions.length > 0 && (
        <Link
          href={`/clubs/${clubId}/sessions/previous`}
          className="flex items-center gap-3 px-5 py-3"
        >
          <History size={16} strokeWidth={2} className="text-text opacity-60" />
          <span className="flex-1 text-[14px] text-text">Previous sessions ({previousSessions.length})</span>
          <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
        </Link>
      )}

      <SectionHeader
        label={`Games (${games.length})`}
        action={
          <LinkButton href={`/clubs/${clubId}/games/new`} variant="secondary" compact>
            Add game
          </LinkButton>
        }
      />
      {games.length === 0 && (
        <p className="px-5 pb-4 text-[14px] text-text opacity-60">
          No games yet — add one before recording results.
        </p>
      )}

      <SectionHeader label="Members" />
      <div className="border-t border-divider">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <InitialSquare label={member.name} size={34} variant="accentTint" />
            <span className="flex-1 text-[14px] text-text">{member.name}</span>
            {member.id === club.owner && <Tag variant="neutral">Owner</Tag>}
          </div>
        ))}
      </div>

      <SectionHeader
        label="Join requests"
        action={requests.length > 0 ? <Tag variant="accent">{requests.length}</Tag> : undefined}
      />
      {requests.length === 0 ? (
        <p className="px-5 pb-6 text-[14px] text-text opacity-60">No pending requests.</p>
      ) : (
        <div className="border-t border-divider pb-2">
          {requests.map(({ player, requestedAt }) => (
            <JoinRequestRow key={player.id} player={player} clubId={clubId} requestedAt={requestedAt} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
