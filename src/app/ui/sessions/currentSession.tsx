"use client";

import { endSession } from "@/app/lib/actions";
import { currentSessionProps } from "./currentSessionProps";
import Link from "next/link";

export default function CurrentSession(props: currentSessionProps) {
  const { session } = props;

  const handleEndSession = () => {
    endSession(session.id);
  };

  return (
    <div className="w-[60em] h-[286px] flex-col justify-start items-start gap-6 inline-flex">
      <div className="self-stretch h-[223px] px-6 py-5 bg-tunnel-snake-black border border-tunnel-snake-orange flex-col justify-start items-start gap-[27px] flex">
        <div className="self-stretch justify-between items-start inline-flex">
          <div className="justify-start items-start gap-4 flex">
            <div className="text-white text-2xl font-semibold font-['Montserrat']">
              {session?.date?.toDateString()}
            </div>
            <div className="text-white text-2xl font-normal font-['Montserrat']">
              {session?.name}
            </div>
          </div>
          <div className="justify-start items-start gap-8 flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                {session.gameResults.length}
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch h-[60px] flex-col justify-start items-start gap-3 flex">
          <div className="self-stretch justify-start items-start gap-2 inline-flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                3
              </div>
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              -
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              Mountains of Madness
            </div>
          </div>
          <div className="self-stretch justify-start items-start gap-2 inline-flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                3
              </div>
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              -
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              Roam
            </div>
          </div>
        </div>
        <div className="justify-start items-start gap-6 inline-flex">
          <Link
            className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex"
            href={{
              pathname: "/add/result/",
              query: { sessionId: session.id, playerIds: session.playerIds.toString() },
            }}
          >
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add result
            </div>
          </Link>

            <button onClick={handleEndSession} className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex">
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              End session
            </div>
            </button>
        </div>
      </div>
    </div>
  );
}
