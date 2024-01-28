"use client";

import { endSession } from "@/app/lib/actions";
import { GameSession, GameResults } from "@/app/lib/definitions";
import Link from "next/link";
import Image from "next/image";

export interface currentSessionProps {
  session: GameSession;
}

export default function CurrentSession(props: currentSessionProps) {
  const { session } = props;

  const formattedDate = session?.date?.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleEndSession = () => {
    endSession(session.id);
  };

  return (
    <div className="w-[60em] self-stretch flex-col justify-start items-start gap-6 inline-flex">
      <div className="self-stretch px-6 py-5 bg-tunnel-snake-black border border-tunnel-snake-orange flex-col justify-start items-start gap-[27px] flex">
        <div className="self-stretch justify-between items-start inline-flex">
          <div className="justify-start items-center gap-4 inline-flex ">
          <Image
                  src={"/Camera.svg"}
                  width={25}
                  height={25}
                  alt={"number of players in session icon"}
                />
            <div className="text-white text-2xl font-semibold font-['Montserrat'] flex">
              {formattedDate}
            </div>
            <div className="text-tunnel-snake-green text-2xl font-normal font-['Montserrat']">
              {session?.name}
            </div>
          </div>
          <div className="justify-start items-start gap-8 flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat'] flex">
                <Image
                  className="pb-1"
                  src={"/Dice.svg"}
                  width={25}
                  height={25}
                  alt={"number of players in session icon"}
                />

                <div className="pl-4">{session.gameResults?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch flex-col justify-start items-center gap-3 flex">
          {session?.gameResults?.map((gameResult: GameResults) => (
            <div key={gameResult.id} className="self-stretch justify-start items-center gap-2 inline-flex">
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat'] inline-flex">
                  <Image
                    className="pb-1"
                    src={"/Players.svg"}
                    width={25}
                    height={25}
                    alt={"number of players in game icon"}
                  />
                  <div className="pl-4">{gameResult.playerScores.length}</div>
                </div>
              </div>
              <div className="text-white text-xl font-normal font-['Montserrat']">
                -
              </div>
              <div className="text-white text-xl font-normal font-['Montserrat']">
                {gameResult.gameName}
              </div>
            </div>
          ))}
        </div>
        <div className="justify-start items-start gap-6 inline-flex">
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
      </div>
    </div>
  );
}
