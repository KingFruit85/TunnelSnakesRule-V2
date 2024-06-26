import Link from "next/link";
import Image from "next/image";
import { GameSession } from "@/app/lib/definitions";

export interface CurrentSessionButtonsProps {
  session: GameSession;
  handleEndSession: () => void;
  clubId: string;
}

export default function CurrentSessionButtons({
  session,
  handleEndSession,
  clubId,
}: CurrentSessionButtonsProps) {
  return (
    <div className="m-4 flex gap-4">
      <Link
        className="text-tunnel-snake-green flex border border-tunnel-snake-green rounded-sm p-2 gap-2 items-center justify-center hover:bg-tunnel-snake-green 
        hover:text-white"
        href={{
          pathname: "/add/result/",
          query: {
            sessionId: session.id,
            playerIds: session.playerIds.toString(),
            clubId: clubId,
          },
        }}
      >
        <Image
          src={"/Trophy.svg"}
          width={20}
          height={20}
          alt={"number of players in session icon"}
        />
        <div className="">Add result</div>
      </Link>

      <button
        onClick={handleEndSession}
        className="text-tunnel-snake-red flex border border-tunnel-snake-red rounded-sm p-2 gap-2 items-center justify-center hover:bg-tunnel-snake-red 
        hover:text-white"
      >
        <div className="">End session</div>
      </button>
    </div>
  );
}
