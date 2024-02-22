"use client";

import { GameSession } from "../lib/definitions";
import NewSessionButton from "../ui/Common/newSessionButton";
import CurrentSession from "../ui/sessions/currentSession/currentSession";
import PreviousSessions from "../ui/sessions/previousSessions";
import { ClubContext } from "./Contexts";

export interface SessionContextWrapperProps {
  clubId: string;
  activeSessions: GameSession[];
  previousSessions: GameSession[];
}

export default function SessionContextWrapper({
  clubId,
  activeSessions,
  previousSessions,
}: SessionContextWrapperProps) {

  console.log("clubId: ", clubId);


  return (
    <>
    <ClubContext.Provider value={clubId}>
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
