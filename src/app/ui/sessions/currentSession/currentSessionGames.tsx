import { GameResults, GameSession } from "@/app/lib/definitions";
import Image from "next/image";

export interface CurrentSessionGamesProps {
  session: GameSession;
}

export default function CurrentSessionGames({
  session,
}: CurrentSessionGamesProps) {

  return (
    <div className="mt-3 mb-4 ml-4 mr-4">
      {session?.gameResults?.map(
        (gameResult: GameResults) => (
          gameResult.id && (
            <div key={gameResult.id} className="flex gap-2">
              <Image
                className=""
                src={"/Players.svg"}
                width={20}
                height={20}
                alt={"number of players in game icon"}
              />
              <div className="">{gameResult.playerScores.length}</div>
              <div className="">-</div>
              <div className="">{gameResult.gameName}</div>
            </div>
          )
        )
      )}
    </div>
  );
}
