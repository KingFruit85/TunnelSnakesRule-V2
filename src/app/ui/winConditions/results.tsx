"use client";

import { BoardGame, Player } from "@/app/lib/definitions";
import { useState } from "react";
import Leaderboard from "./leaderboard";

export interface ResultsProps {
  games: BoardGame[];
  players: Player[];
}

export default function Results({ games, players }: ResultsProps) {
  const [game, setGame] = useState<BoardGame>(games[0]);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const [winCondition, setWinCondition] = useState<string>("leaderBoard");

  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;
    console.log(selectedGameId);

    const selectedGame = games.find((game) => game.name === selectedGameId);

    if (!selectedGame) {
      // Handle the case where selectedGame is undefined
      // For example, you might want to set a default value or show an error message
      console.error("Selected game not found");
      return;
    }

    setGame(selectedGame);

    switch (selectedGame?.winCondition) {
      case "leaderBoard":
        setWinCondition(selectedGame?.winCondition);
        break;
      case "teamBased":
        setWinCondition(selectedGame?.winCondition);
        break;
      case "cooperative":
        setWinCondition(selectedGame?.winCondition);
        break;
    }
  };

  return (
    <div className="flex flex-col ">
      <div className="flex justify-center">
        {showNotes && (
          <textarea
            name="resultNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-4 bg-tunnel-snake-grey border rounded-sm border-tunnel-snake-green text-tunnel-snake-orange w-[20pc] h-[5pc]"
          />
        )}
      </div>
      <div className="flex mb-2 pb-2 pt-2 gap-4 justify-between">
        <select
          id="boardgame"
          value={game?.name}
          onChange={handleGameChange}
          className="text-tunnel-snake-green bg-tunnel-snake-black text-2xl font-semibold font-['Montserrat']"
        >
          {games.map((game) => (
            <option key={game.id} value={game.name}>
              {game.name}
            </option>
          ))}
        </select>
        <button type="button">
          <img src={"/Camera.svg"} alt={"Camera icon"} width={35} />
        </button>
        <button type="button" onClick={handleShowNotes}>
          <img src={"/Paper.svg"} alt={"Paper icon"} width={35} />
        </button>
      </div>

      <input type="hidden" name={"gameName"} value={game?.name || ""} />

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
