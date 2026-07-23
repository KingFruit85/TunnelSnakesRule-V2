// src/app/clubs/[clubId]/sessions/[sessionId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getSessionDetails } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getSessionPlaySummaries } from "@/app/lib/db/results";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import Tag from "@/app/ui/ds/Tag";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import LinkButton from "@/app/ui/ds/LinkButton";
import SessionNotesEditor from "@/app/ui/clubs/SessionNotesEditor";
import PhotoGrid from "@/app/ui/clubs/PhotoGrid";
import FinishReopenButton from "@/app/ui/clubs/FinishReopenButton";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [club, sessionRows, games, plays] = await Promise.all([
    getClubDetails(clubId),
    getSessionDetails(sessionId),
    getAllBoardgames(clubId),
    getSessionPlaySummaries(clubId, sessionId),
  ]);
  const session = sessionRows[0];
  if (!session) {
    redirect(`/clubs/${clubId}`);
  }

  const images = session.imageurl ? (JSON.parse(session.imageurl) as string[]) : [];

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title={session.name} eyebrow={club.name} />

      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="text-[12.5px] text-text opacity-60">{session.date.toLocaleDateString()}</p>
        <Tag variant={session.active ? "accent" : "neutral"}>{session.active ? "Active" : "Finished"}</Tag>
      </div>

      <div className="flex flex-1 flex-col">
        <SessionNotesEditor sessionId={sessionId} initialNotes={session.notes ?? ""} />
        <PhotoGrid sessionId={sessionId} clubId={clubId} images={images} />
        <div className="flex justify-end px-5 pb-2">
          <FinishReopenButton sessionId={sessionId} active={session.active} notes={session.notes ?? ""} />
        </div>

        <SectionHeader
          label="Results"
          action={
            games.length > 0 ? (
              <LinkButton href={`/add/result?sessionId=${sessionId}&clubId=${clubId}`} variant="primary" compact>
                Add result
              </LinkButton>
            ) : undefined
          }
        />
        {games.length === 0 ? (
          <div className="px-5 pb-6">
            <p className="text-[14px] text-text opacity-60">Add a game before recording results.</p>
            <div className="mt-3">
              <LinkButton href={`/clubs/${clubId}/games/new`} variant="secondary" compact>
                Add a game
              </LinkButton>
            </div>
          </div>
        ) : plays.length === 0 ? (
          <p className="px-5 pb-6 text-[14px] text-text opacity-60">No results recorded yet.</p>
        ) : (
          <div className="border-t border-divider pb-2">
            {plays.map((play) => (
              <div key={play.playId} className="flex gap-3 border-b border-divider px-5 py-3">
                <Trophy size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
                <div className="flex-1">
                  <p className="text-[15.5px] font-semibold text-text">{play.gameName}</p>
                  <p className="text-[13px] text-text">{play.summary}</p>
                  <p className="text-[12px] text-text opacity-55">{play.detail}</p>
                  {play.notes && (
                    <p className="mt-2 border-l-2 border-accent bg-accent-100 px-2 py-1 text-[12.5px] text-text">
                      {play.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
