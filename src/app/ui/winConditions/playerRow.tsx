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
  {id: 1, name: "Team 1"},
  {id: 2, name: "Team 2"},
  {id: 3, name: "Team 3"},
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
    <div className="h-8 relative pb-4">
      <div className="content-center gap-3 inline-flex pt-2">
        <input
          type="checkbox"
          id={player.id}
          checked={checked}
          value={checked ? "true" : "false"}
          onChange={handleCheckboxChange}
          className="w-6 h-6 relative text-white rounded-sm"
        />

        <input
          type="hidden"
          name={`player_${player.id}`}
          value={[checked ? "true" : "false", score.toString(), team ? team.name : ""]}
        />

        <label className="text-white text-base font-normal font-['Montserrat']">
          {player.name}
        </label>
      </div>
      <div className="w-[72px] h-8 left-[195px] top-0 absolute flex-col justify-start items-start gap-5 inline-flex">
        <input
          type="number"
          id="score"
          onChange={handleScoreChange}
          className="w-[72px] grow shrink basis-0 px-3 py-1.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-center gap-2.5 inline-flex"
        />
      </div>
      <div className="w-[72px] h-8 left-[350px] top-0 absolute flex-col justify-start items-start gap-5 inline-flex">
        {winCondition === "teamBased" && (
          <select
          id="team"
          value={team?.name}
          onChange={handleTeamChange}
          className="text-tunnel-snake-green bg-tunnel-snake-black text-2xl font-semibold font-['Montserrat']"
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


