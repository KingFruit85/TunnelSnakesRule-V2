import React, { useState } from "react";
import { Player } from "@/app/lib/definitions";

export interface PlayerRowProps {
  player: Player;
}

export default function PlayerRow(props: PlayerRowProps) {
  const { player } = props;
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);

  const handleCheckboxChange = () => {
    setChecked(!checked);
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScore = parseInt(e.target.value);
    setScore(newScore);
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
          value={[checked ? "true" : "false", score.toString()]}
        />

        <label className="text-white text-base font-normal font-['Montserrat']">
          {player.name}
        </label>
      </div>
      <div className="w-[72px] h-8 left-[217px] top-0 absolute flex-col justify-start items-start gap-5 inline-flex">
        <input
          type="number"
          id="score"
          onChange={handleScoreChange}
          className="w-[72px] grow shrink basis-0 px-3 py-1.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-center gap-2.5 inline-flex"
        ></input>
      </div>
    </div>
  );
}
