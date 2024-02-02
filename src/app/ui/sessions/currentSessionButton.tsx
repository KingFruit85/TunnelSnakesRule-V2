import Link from "next/link";
import Image from "next/image";
import { GameSession } from "@/app/lib/definitions";

export interface CurrentSessionButtonsProps {
  session: GameSession;
  handleEndSession: () => void;
}

export default function CurrentSessionButtons({
  session,
  handleEndSession,
}: CurrentSessionButtonsProps) {
  return (
    <div className="justify-start items-start gap-6 inline-flex items-center">
      <Link
        className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex"
        href={{
          pathname: "/add/result/",
          query: {
            sessionId: session.id,
            playerIds: session.playerIds.toString(),
          },
        }}
      >
        <Image
          src={"/Trophy.svg"}
          width={20}
          height={20}
          alt={"number of players in session icon"}
        />
        <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
          Add result
        </div>
      </Link>

      <button
        onClick={handleEndSession}
        className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-red justify-start items-center gap-3 flex"
      >
        <div className="text-tunnel-snake-red text-base font-medium font-['Montserrat'] inline-flex">
          End session
        </div>
      </button>
    </div>
  );
}
