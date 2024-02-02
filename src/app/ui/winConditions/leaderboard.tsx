"use client";

import { Player } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";
import TeambasedRadio from "../add/Results/teambasedradio";
import LeaderboardRadio from "../add/Results/leaderboardradio";
import CooperativeRadio from "../add/Results/cooperativeradio";

export interface LeaderboardProps {
  players: Player[];
  winCondition: string;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { players, winCondition } = props;

  return (
    <div className="flex flex-col items-center">
      {winCondition === "teamBased" && <TeambasedRadio />}
      {winCondition === "leaderBoard" && <LeaderboardRadio />}
      {winCondition === "cooperative" && <CooperativeRadio />}

      <div className="text-center font-montserrat flex items-center text-tunnel-snake-orange gap-4">
        <div className="">Players</div>
        <div className="">Score</div>
        {winCondition === "teamBased" && <div className="">Team</div>}
      </div>
      <ul className="flex flex-col gap-2">
        {players.map((player: Player) => (
          <PlayerRow
            key={player.id}
            player={player}
            winCondition={winCondition}
          />
        ))}
      </ul>
    </div>
  );
}
