"use client";

import { Player, WinCondition } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";
import TeambasedRadio from "../add/Results/teambasedradio";
import LeaderboardRadio from "../add/Results/leaderboardradio";
import CooperativeRadio from "../add/Results/cooperativeradio";

export interface LeaderboardProps {
  players: Player[];
  winCondition: WinCondition;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { players, winCondition } = props;

  return (
    <div className="flex flex-col items-center">
      {winCondition == WinCondition.TeamBased && <TeambasedRadio />}
      {winCondition == WinCondition.LeaderBoard && <LeaderboardRadio />}
      {winCondition == WinCondition.Coopratitive && <CooperativeRadio />}

      <ul className="flex flex-col gap-2 m-4 w-[100%]">
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
