"use client";

import { BoardGame, Player, WinCondition } from "@/app/lib/definitions";
import { useState } from "react";
import Leaderboard from "./leaderboard";
import { redirect } from "next/navigation";
import Image from "next/image";

export interface ResultsProps {
  games: BoardGame[];
  players: Player[];
}

export default function Results({ games, players }: ResultsProps) {
  const [game, setGame] = useState<BoardGame>(games[0]);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [winCondition, setWinCondition] = useState<WinCondition>(WinCondition.LeaderBoard);

  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  const handleClose = () => {
    redirect("/sessions/");
  };

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;

    const selectedGame = games.find((game) => game.name === selectedGameId);

    if (!selectedGame) {
      // Handle the case where selectedGame is undefined
      // For example, you might want to set a default value or show an error message
      console.error("Selected game not found");
      return;
    }

    setGame(selectedGame);

    switch (selectedGame?.winCondition) {
      case WinCondition.LeaderBoard.toString():
        setWinCondition(WinCondition.LeaderBoard);
        break;
      case WinCondition.TeamBased.toString():
        setWinCondition(WinCondition.TeamBased);
        break;
      case WinCondition.Coopratitive.toString():
        setWinCondition(WinCondition.Coopratitive);
        break;
      default: console.log("No win condition found");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="">
        {showNotes && (
          <textarea
            name="resultNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-tunnel-snake-grey border rounded-sm 
                     border-tunnel-snake-green text-tunnel-snake-orange 
                     w-[20pc] h-[5pc] pl-2 pt-2 pb-2 pr-2"
          />
        )}
      </div>
      <div className="flex mb-2 pb-2 pt-2 gap-4 justify-between">
        <select
          id="boardgame"
          value={game?.name}
          onChange={handleGameChange}
          className="text-tunnel-snake-green bg-tunnel-snake-black text-2xl sm:text-1xl md:text-3xl lg:text-3xl xl:text-3xl font-semibold font-['Montserrat']"
        >
          {games.map((game) => (
            <option key={game.id} value={game.name}>
              {game.name}
            </option>
          ))}
        </select>
        <button type="button">
          <Image src={"/Camera.svg"} alt={"Camera icon"} width={20} height={20}  />
        </button>

        <button type="button" onClick={handleShowNotes}>
          <Image src={"/Paper.svg"} alt={"Paper icon"} width={20} height={20} />
        </button>
      </div>

      <input type="hidden" name={"gameId"} value={game?.id || ""} />

      <input
        type="hidden"
        name={"winCondition"}
        value={game?.winCondition || ""}
      />

      <input type="hidden" name={"gameResultNotes"} value={notes} />

      <Leaderboard players={players} winCondition={winCondition} />
    </div>
  );
}
