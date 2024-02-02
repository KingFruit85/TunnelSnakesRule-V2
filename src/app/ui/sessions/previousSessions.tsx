import { GameSession } from "@/app/lib/definitions";

export interface PreviousSessionsProps {
  sessions: GameSession[];
}

export default function PreviousSessions(props: PreviousSessionsProps) {
  const { sessions } = props;

  // Sort sessions by date in descending order
  const sortedSessions = [...sessions].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="w-[95%] max-w-screen-95 mx-auto">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat">
        History
      </div>

      {sortedSessions.map((session) => (
        <div
          key={session.id}
          className="mb-4 bg-black flex-col"
        >
          <div className="flex flex-row gap-2 ml-2 mt-2 mr-2 ">
            <div className="text-tunnel-snake-green">
              {session?.date?.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>

            <div className="flex gap-2">
              <img src={"/Dice.svg"} alt={"dice icon"} />
              <div className="">{session.gameResults?.length || 0}</div>
            </div>
          </div>

          <div className="ml-2">{session?.name}</div>
          <div className="ml-2 mb-2 text-tunnel-snake-orange">View session</div>
        </div>
      ))}
    </div>
  );
}
