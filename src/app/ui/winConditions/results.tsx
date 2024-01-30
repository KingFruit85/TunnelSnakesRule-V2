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

  const [winCondition, setWinCondition] = useState<string>("leaderBoard");

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;
    console.log(selectedGameId)

    const selectedGame = games.find(
      (game) => game.name === selectedGameId
    );

    if (!selectedGame) {
      // Handle the case where selectedGame is undefined
      // For example, you might want to set a default value or show an error message
      console.error("Selected game not found");
      return;
    }

    setGame(selectedGame);

    console.log(selectedGame);

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
    <div className="items-center flex-col">
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

      <input type="hidden" name={"gameName"} value={game?.name || ""} />

      <input
        type="hidden"
        name={"winCondition"}
        value={game?.winCondition || ""}
      />

      <Leaderboard players={players} winCondition={winCondition} />
    </div>
  );
}
