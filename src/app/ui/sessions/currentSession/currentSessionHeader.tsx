"use client";

import { GameSession } from "@/app/lib/definitions";
import Image from "next/image";

import { useRouter } from "next/navigation";
import Link from "next/link";

export interface CurrentSessionHeaderProps {
  handleShowNotes: () => void;
  recordNotes: (note: string) => void;
  notes: string;
  showNotes: boolean;
  formattedDate: string;
  session?: GameSession;
}

export default function CurrentSessionHeader({
  handleShowNotes,
  recordNotes,
  notes,
  showNotes,
  formattedDate,
  session,
}: CurrentSessionHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex-col items-center ">
      <div className="gap-4 flex mt-2 ml-2 mr-2 items-center mb-2">
        <Link
          className=""
          href={{
            pathname: "/add/session/upload/",
            query: {
              sessionId: session?.id as string,
            },
          }}
        >
          <Image
            className="flex items-center gap-2"
            src={"/Camera.svg"}
            width={20}
            height={20}
            alt={"add photo icon"}
          />
        </Link>

        <button type="button" onClick={handleShowNotes}>
          <Image
            className="flex items-center gap-2"
            src={"/Paper.svg"}
            width={20}
            height={20}
            alt={"add notes icon"}
          />
        </button>
        <div className="text-base md:text-lg lg:text-lg xl:text-lg text-center font-montserrat flex items-center">
          {formattedDate}
        </div>

        <div className="text-1xl md:text-2xl lg:text-2xl xl:text-2xl text-center font-montserrat flex items-center text-tunnel-snake-green">
          {session?.name}
        </div>
        <div className="flex items-center gap-2 mr-1">
          <Image
            src={"/Dice.svg"}
            width={20}
            height={20}
            alt={"number of players in session icon"}
          />

          <div>{session?.gameResults?.length || 0}</div>
        </div>
      </div>
      {showNotes && (
        <div className="flex flex-col bg-black items-center mt-4 mr-4 ml-4">
          <textarea
            name="sessionNotes"
            value={notes}
            onChange={(e) => recordNotes(e.target.value)}
            className="bg-tunnel-snake-grey border rounded-sm 
                     border-tunnel-snake-green text-tunnel-snake-orange 
                     w-[20pc] h-[5pc] pl-2 pt-2 pb-2 pr-2"
          />
        </div>
      )}
    </div>
  );
}
