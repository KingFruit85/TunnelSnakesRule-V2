import { GameSession } from "@/app/lib/definitions";
import Link from "next/link";

export interface PreviousSessionsProps {
  sessions: GameSession[];
}

export default function PreviousSessions(props: PreviousSessionsProps) {
  const { sessions } = props;

  // Sort sessions by date in descending order
  const sortedSessions = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="w-[60em] h-[692px] flex-col justify-start items-start gap-6 inline-flex">
      <div className="self-stretch justify-between items-start inline-flex">
        <div className="text-white text-[32px] font-semibold font-['Montserrat']">
          History
        </div>
        <div className="px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex">
          <Link
            className="text-tunnel-snake-green text-base font-medium font-['Montserrat']"
            href={"/sessions/newSession"}
          >
            New session
          </Link>
        </div>
      </div>
      <div className="self-stretch flex-col justify-start items-start gap-8 flex">
        {sortedSessions.map((session) => (
          <div className="self-stretch h-[133px] px-6 pt-5 pb-6 bg-tunnel-snake-black rounded-sm flex-col justify-start items-start gap-2 flex">
            <div className="self-stretch justify-between items-center inline-flex">
              <div className="text-tunnel-snake-green text-base font-semibold font-['Montserrat']">
                {session?.date?.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="justify-start items-start gap-8 flex">
                <div className="justify-start items-center gap-2 flex">
                  <img src={"/Dice.svg"} alt={"dice icon"} />
                  <div className="text-white text-xl font-medium font-['Montserrat']">
                    {session.gameResults?.length || 0}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-white text-2xl font-normal font-['Montserrat']">
              {session?.name}
            </div>
            <div className="rounded-sm justify-start items-center gap-2 inline-flex">
              <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat'] underline">
                View session
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
