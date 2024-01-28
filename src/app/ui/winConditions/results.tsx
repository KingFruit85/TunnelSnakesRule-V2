"use client";

import { BoardGame, Player } from "@/app/lib/definitions";
import { useState } from "react";
import Leaderboard from "./leaderboard";
import TeamBased from "./teambased";

export interface ResultsProps {
  games: BoardGame[];
  players: Player[];
}

export default function Results(props: ResultsProps) {
  const { games } = props;

  const [game, setGame] = useState<string>();
  const [winCondition, setWinCondition] = useState<string>("leaderBoard");

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;
    console.log(selectedGameId);
    const selectedGame = games.find((game) => game.id === selectedGameId) || null;
    setGame(selectedGame?.name);
    console.log(selectedGame?.winCondition);
    setWinCondition(selectedGame ? selectedGame.winCondition : "leaderBoard");
  };

  return (
    <div>
      <select
        name="boardgame"
        value={game}
        onChange={handleGameChange}
        className="text-tunnel-snake-green bg-tunnel-snake-black text-2xl font-semibold font-['Montserrat']"
      >
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.name}
          </option>
        ))}
      </select>

      {winCondition === "leaderBoard" && (
        <Leaderboard players={props.players} />
      )}
      {winCondition === "teamBased" && <TeamBased />}
    </div>
  );
}
