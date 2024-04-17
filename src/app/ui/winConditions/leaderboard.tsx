"use client";

import { BoardGame, Player, WinCondition } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";
import TeambasedRadio from "../add/Results/teambasedradio";
import CooperativeRadio from "../add/Results/cooperativeradio";

export interface LeaderboardProps {
  players: Player[];
  game: BoardGame;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { players, game } = props;

  return (
    <div className="flex flex-col items-center">
      {parseInt(game.winCondition) == WinCondition.TeamBased && (
        <TeambasedRadio />
      )}
      {parseInt(game.winCondition) == WinCondition.LeaderBoard && (
        <input
          type="hidden"
          id="contactChoice2"
          name="scoringDirection"
          value={game.scoringDirection}
          className=""
        />
      )}
      {parseInt(game.winCondition) == WinCondition.Coopratitive && (
        <CooperativeRadio />
      )}

      <ul className="flex flex-col gap-2 m-4 w-[100%]">
        {players.map((player: Player) => (
          <PlayerRow key={player.id} player={player} game={game} />
        ))}
      </ul>
    </div>
  );
}
