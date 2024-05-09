import React, { useState } from "react";
import { BoardGame, Player, WinCondition } from "@/app/lib/definitions";
import Image from "next/image";
import { Radio } from "@geist-ui/core";

export interface PlayerRowProps {
  player: Player;
  game: BoardGame;
}

type Team = {
  id: number;
  name: string;
};

export const teams = [
  { id: 1, name: "Team 1" },
  { id: 2, name: "Team 2" },
  { id: 3, name: "Team 3" },
  { id: 3, name: "Team 4" },
] as Team[];

export default function PlayerRow({ player, game }: PlayerRowProps) {
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(true);
  const [team, setTeam] = useState<Team>(teams[0]);

  const handleCheckboxChange = () => {
    setChecked(!checked);
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScore = parseInt(e.target.value);
    setScore(newScore);
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeam = e.target.value;
    const team = teams.find((team) => team.name === newTeam);
    team ? setTeam(team) : console.error("Team not found");
  };

  return (
    <div className="flex gap-14 p-2 rounded-sm w-[100%] border border-tunnel-snake-grey">
      <input
        type="hidden"
        name={`player_${player.id}`}
        value={[
          checked ? "true" : "false",
          score.toString(),
          team ? team.name : "",
        ]}
      />

      <div className="flex gap-1">
        <input
          type="checkbox"
          id={player.id}
          checked={checked}
          value={checked ? "true" : "false"}
          onChange={handleCheckboxChange}
          className="mr-2 accent-tunnel-snake-green w-5"
        />
        <Image
          src={player.avatar}
          alt={player.name}
          width={25}
          height={25}
          className="rounded-full"
        />
      </div>

      <div className="flex border rounded-sm w-[25%]">
        <input
          type="number"
          id="score"
          onChange={handleScoreChange}
          className="bg-tunnel-snake-grey text-tunnel-snake-green text-center w-[100%]"
        />
      </div>

      <div className="flex">
        {parseInt(game.winCondition) === WinCondition.TeamBased && (
          <select
            id={team.name}
            value={team?.name}
            onChange={handleTeamChange}
            className="bg-tunnel-snake-black text-tunnel-snake-orange text-center"
          >
            {teams.map((team) => (
              <option key={team.name} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
