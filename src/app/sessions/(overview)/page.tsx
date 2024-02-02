import { getAllActiveSessions, getAllInactiveSessions } from "@/app/lib/data";
import NewSessionButton from "@/app/ui/Common/newSessionButton";
import CurrentSession from "@/app/ui/sessions/currentSession/currentSession";
import PreviousSessions from "@/app/ui/sessions/previousSessions";
import { redirect } from "next/navigation";

export default async function Page() {
  const activeSessions = await getAllActiveSessions();
  const previousSessions = await getAllInactiveSessions();

  return (
    <div className="flex flex-col gap-2 items-center  h-screen">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mt-4 mb-2">
        Active Sessions
      </div>
      {activeSessions.length === 0 && (
        <NewSessionButton />
      )}
      {activeSessions.map((session) => (
        <div key={session.id}>
          <CurrentSession session={session} />
        </div>
      ))}
      <PreviousSessions sessions={previousSessions} />
    </div>
  );
}
