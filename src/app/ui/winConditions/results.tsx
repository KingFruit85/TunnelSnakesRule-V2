"use client";

import { BoardGame, Player } from "@/app/lib/definitions";
import { useState } from "react";
import Leaderboard from "./leaderboard";
import Image from "next/image";

export interface ResultsProps {
  games: BoardGame[];
  players: Player[];
}

export default function Results({ games, players }: ResultsProps) {
  const [game, setGame] = useState<BoardGame>(games[0]);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;

    const selectedGame = games.find((game) => game.name === selectedGameId);

    if (!selectedGame) {
      // Handle the case where selectedGame is undefined
      console.error("Selected game not found");
      return;
    }
    setGame(selectedGame);
  };

  return (
    <div className="flex flex-col items-center">
      {games.length > 0 ? (
        <>
          {showNotes && (
            <div className="">
              <textarea
                name="resultNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-tunnel-snake-grey border rounded-sm 
                           border-tunnel-snake-green text-tunnel-snake-orange 
                           w-[20pc] h-[5pc] pl-2 pt-2 pb-2 pr-2"
              />
            </div>
          )}

          <Image
            src={"/coup.png"}
            alt={"coup"}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "100%", height: "auto" }}
          />

          <div className="flex mb-2 pb-2 pt-2 ">
            {games.length > 0 && (
              <select
                id="boardgame"
                value={game?.name}
                onChange={handleGameChange}
                className="text-tunnel-snake-green bg-tunnel-snake-black font-bold"
              >
                {games.map((game) => (
                  <option key={game.id} value={game.name}>
                    {game.name}
                  </option>
                ))}
              </select>
            )}

            <button type="button" onClick={handleShowNotes} className="pl-4">
              <Image
                src={"/Paper.svg"}
                alt={"Paper icon"}
                width={20}
                height={20}
              />
            </button>
          </div>

          <input type="hidden" name={"gameId"} value={game?.id || ""} />
          <input
            type="hidden"
            name={"winCondition"}
            value={game?.winCondition || ""}
          />
          <input type="hidden" name={"gameResultNotes"} value={notes} />

          <Leaderboard players={players} game={game} />
        </>
      ) : (
        <h1 className="text-2xl text-center p-4 ">
          You need to add a boardgame to the group before you can record a
          result{" "}
        </h1>
      )}
    </div>
  );
}
