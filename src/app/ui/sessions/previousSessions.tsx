import { GameSession } from "@/app/lib/definitions";
import Image from "next/image";
import Link from "next/link";

export interface PreviousSessionsProps {
  sessions: GameSession[];
  clubId: string;
}

export default function PreviousSessions(props: PreviousSessionsProps) {
  const { sessions, clubId } = props;

  // Sort sessions by date in descending order
  const sortedSessions = [...sessions].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="text-white bg-black dark:bg-black text-white">
      <div className="text-2xl flex mb-2 ">Previous Sessions</div>

      {sortedSessions.map((session) => {
        return (
          <div
            key={session.id}
            className="mb-4 pl-4 bg-tunnel-snake-grey flex-col shadow-inner"
          >
            <div className="flex flex-row pt-2 place-content-between">
              <div className="text-tunnel-snake-green">
                {session?.date?.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>

            <div>{session?.name}</div>
            <Link
              className="flex gap-2 pb-2 text-tunnel-snake-orange underline-offset-4"
              href={{
                pathname: "/sessions/previousSession",
                query: { sessionId: session.id, clubId: clubId },
              }}
            >
              <u>View session</u>{" "}
              <Image
                src={"/RightArrow.svg"}
                alt={"dice icon"}
                width={15}
                height={15}
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
