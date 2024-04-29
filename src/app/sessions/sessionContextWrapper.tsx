"use client";

import { BoardGame, Destination, GameSession } from "../lib/definitions";
import NewSessionButton from "../ui/Common/newSessionButton";
import CurrentSession from "../ui/sessions/currentSession/currentSession";
import PreviousSessions from "../ui/sessions/previousSessions";
import { ClubContext } from "./Contexts";
import PageRedirectButton from "../ui/Common/pageRedirectButton";

export interface SessionContextWrapperProps {
  clubId: string;
  activeSessions: GameSession[];
  previousSessions: GameSession[];
  userId: string | null;
  isClubOwner: boolean;
  accessRequestsPending: boolean;
  boardgames: BoardGame[];
}

export default function SessionContextWrapper({
  clubId,
  activeSessions,
  previousSessions,
  userId,
  isClubOwner,
  accessRequestsPending,
  boardgames,
}: SessionContextWrapperProps) {
  return (
    <ClubContext.Provider value={clubId}>
      {isClubOwner && accessRequestsPending ? (
        <PageRedirectButton
          destination={Destination.ReviewAceessRequests}
          userId={userId}
          clubId={clubId}
        />
      ) : null}
      {activeSessions.length === 0 && <NewSessionButton />}
      {activeSessions.map((session) => (
        <div key={session.id} className="p-4">
          <CurrentSession session={session} boardgames={boardgames} />
        </div>
      ))}
      <div className="p-4">
        <PreviousSessions sessions={previousSessions} />
      </div>
    </ClubContext.Provider>
  );
}
