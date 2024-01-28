"use client";

import { BoardGame, Player } from "@/app/lib/definitions";
import { useState } from "react";
import Leaderboard from "./leaderboard";
import TeamBased from "./teambased";
import { set } from "zod";

export interface ResultsProps {
  games: BoardGame[];
  players: Player[];
}

export default function Results(props: ResultsProps) {
  const { games } = props;

  const placeholderGame = {
      id: 0,
      name: "Select game",
      winCondition: "leaderBoard",
      picture: ""
  } as unknown as BoardGame;

  const [game, setGame] = useState<BoardGame>(placeholderGame);
  const [winCondition, setWinCondition] = useState<string>("leaderBoard");

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGameId = e.target.value;

    const selectedGame = games.find(
      (game) => String(game.id) === selectedGameId
    );

    setGame(selectedGame!);

    switch (selectedGame?.winCondition) {
      case "leaderBoard":
        setWinCondition("leaderBoard");
        break;
      case "teamBased":
        setWinCondition("teamBased");
        break;
    }
  };

  return (
    <div>
      <select
        id="boardgame"
        value={game.name}
        onChange={handleGameChange}
        className="text-tunnel-snake-green bg-tunnel-snake-black text-2xl font-semibold font-['Montserrat']"
      >
        {games.map((game) => (
          <option key={game.id} value={game.id}>
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

      {winCondition === "leaderBoard" && (
        <Leaderboard players={props.players} />
      )}
      {winCondition === "teamBased" && <TeamBased />}
    </div>
  );
}
