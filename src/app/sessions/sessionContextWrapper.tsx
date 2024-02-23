"use client";

import { Destination, GameSession } from "../lib/definitions";
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
}

export default function SessionContextWrapper({
  clubId,
  activeSessions,
  previousSessions,
  userId,
  isClubOwner,
  accessRequestsPending,
}: SessionContextWrapperProps) {
  return (
    <>
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
          <div key={session.id}>
            <CurrentSession session={session} />
          </div>
        ))}
        <PreviousSessions sessions={previousSessions} />
      </ClubContext.Provider>
    </>
  );
}
