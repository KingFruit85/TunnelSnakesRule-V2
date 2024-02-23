import { GameSession } from "@/app/lib/definitions";
import Image from "next/image";

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
    <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[35%] sm:w-[95%]">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mb-2 mt-2">
        Previous Sessions
      </div>

      {sortedSessions.map((session) => (
        <div key={session.id} className="mb-4 bg-black flex-col">
          <div className="flex flex-row gap-2 pl-4 pt-2 place-content-between pr-4">
            <div className="text-tunnel-snake-green">
              {session?.date?.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>

            <div className="flex gap-2">
              <Image src={"/Dice.svg"} alt={"dice icon"} width={20} height={20}/>
              <div className="">{session.gameResults?.length || 0}</div>
            </div>
          </div>

          <div className="pl-4 pt-2 ">{session?.name}</div>
          <div className="flex  gap-2 pl-4 pt-2 pb-2 text-tunnel-snake-orange underline-offset-4">
            <u>View session</u>{" "}
            <Image
              src={"/RightArrow.svg"}
              alt={"dice icon"}
              width={15}
              height={15}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
