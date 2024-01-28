import { getAllActiveSessions } from "@/app/lib/data";
import CurrentSession from "@/app/ui/sessions/currentSession";
import PreviousSessions from "@/app/ui/sessions/previousSessions";

export default async function Page() {
  const activeSessions = await getAllActiveSessions();
  return (

    <div className="flex-col space-items items-center m-10">
      <div className="flex flex-col space-items items-center m-10">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Active Sessions
      </div>
        { activeSessions.map((session) => (
          <div key={session.id}>
            <CurrentSession session={session} />
          </div>
        ))}
      </div>

      <div className="flex flex-col space-items items-center">
        <PreviousSessions />
      </div>

    </div >
  );
}

