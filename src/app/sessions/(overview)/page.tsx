import CurrentSession from "@/app/ui/sessions/currentSession";
import PreviousSessions from "@/app/ui/sessions/previousSessions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sessions",
};

export default function Page() {
  return (
    <div className="flex-col space-items items-center m-10">

      <div className="flex flex-col space-items items-center m-10">
      <CurrentSession />
      </div>

      <div className="flex flex-col space-items items-center">
        <PreviousSessions />
      </div>

    </div >
  );
}


// style={{width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', gap: 48, display: 'inline-flex'}}