import React, { useState } from "react";
import { Player } from "@/app/lib/definitions";

export interface PlayerRowProps {
  player: Player;
  winCondition: string;
}

type Team = {
  id: number;
  name: string;
};

export const teams = [
  { id: 1, name: "Team 1" },
  { id: 2, name: "Team 2" },
  { id: 3, name: "Team 3" },
] as Team[];

export default function PlayerRow({ player, winCondition }: PlayerRowProps) {
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
    <div className="flex gap-6">
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
          className="mr-2"
        />
        <img src={player.avatar} alt={player.name} width={25} height={25} className="rounded-full"/>

        <label className="">{player.name}</label>
      </div>

      <div className="flex border rounded-sm">
        <input
          type="number"
          id="score"
          onChange={handleScoreChange}
          className="bg-tunnel-snake-grey text-tunnel-snake-orange text-center  "
        />
      </div>

      <div className="flex">
        {winCondition === "teamBased" && (
          <select
            id="team"
            value={team?.name}
            onChange={handleTeamChange}
            className="bg-tunnel-snake-grey text-tunnel-snake-orange text-center"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
