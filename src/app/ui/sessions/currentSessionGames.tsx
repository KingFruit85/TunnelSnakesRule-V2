import { GameResults, GameSession } from "@/app/lib/definitions";
import Image from "next/image";


export interface CurrentSessionGamesProps {
session: GameSession;
  }
  
  export default function CurrentSessionGames({ session }: CurrentSessionGamesProps) {

    return (
       <div>
         {session?.gameResults?.map(
            (gameResult: GameResults) => (
              console.log(gameResult.id),
              gameResult.id && (
                <div
                  key={gameResult.id}
                  className="self-stretch justify-start items-center gap-2 inline-flex"
                >
                  <div className="justify-start items-center gap-2 flex">
                    <div className="text-white text-xl font-medium font-['Montserrat'] inline-flex">
                      <Image
                        className="pb-1"
                        src={"/Players.svg"}
                        width={25}
                        height={25}
                        alt={"number of players in game icon"}
                      />
                      <div className="pl-4">
                        {gameResult.playerScores.length}
                      </div>
                    </div>
                  </div>
                  <div className="text-white text-xl font-normal font-['Montserrat']">
                    -
                  </div>
                  <div className="text-white text-xl font-normal font-['Montserrat']">
                    {gameResult.gameName}
                  </div>
                </div>
              )
            )
          )}
       </div>
    )
  }