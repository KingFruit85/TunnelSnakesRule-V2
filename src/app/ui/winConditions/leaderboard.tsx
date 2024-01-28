"use client";

import { Player } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import React from "react";

export interface LeaderboardProps {
  players: Player[];
}


export default function Leaderboard(props: LeaderboardProps) {
  const { players } = props;
  const [selection, setSelection] = React.useState('high');
  
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newSelection: string,
  ) => {
    if (newSelection !== null) {
      setSelection(newSelection);
    }
  };
  

  return (
    <div className="flex-col justify-start items-start gap-3 flex mt-4">

      <ToggleButtonGroup
        className="bg-white/50 rounded-sm"
        exclusive
        onChange={handleChange}
        aria-label="Platform"
      >
        <ToggleButton value="high">High</ToggleButton>
        <ToggleButton value="low">Low</ToggleButton>
      </ToggleButtonGroup>

      <input
          type="hidden"
          name={"scoringDirection"}
          value={selection}
        />

      <div className="w-[482px] h-[17px] relative">
        <div className="left-0 top-0 absolute text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
          Players
        </div>
        <div className="left-[216px] top-0 absolute text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
          Score
        </div>
      </div>
      <div className="w-[481px] justify-start items-start gap-8 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-5 inline-flex">
          <div className="flex-col justify-start items-start gap-4 flex">
            <div className="flex-col justify-start items-start gap-5 flex">
              <ul className="space-y-5">
                {players.map((player: Player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
