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
    <div className="ml-4 mb-4 flex gap-4">
      <Link
        className="text-tunnel-snake-green flex border border-tunnel-snake-green rounded-sm p-2 gap-2 items-center justify-center"
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
        <div className="">
          Add result
        </div>
      </Link>

      <button
        onClick={handleEndSession}
        className="text-tunnel-snake-red flex border border-tunnel-snake-red rounded-sm p-2 gap-2 items-center justify-center"
      >
        <div className="">
          End session
        </div>
      </button>
    </div>
  );
}
