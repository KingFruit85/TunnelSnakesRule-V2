"use client";

import { BoardGame, Player, WinCondition } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";
import TeambasedRadio from "../add/Results/teambasedradio";
import CooperativeRadio from "../add/Results/cooperativeradio";
import { useState } from "react";
import Image from "next/image";

export interface LeaderboardProps {
  players: Player[];
  game: BoardGame;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { players, game } = props;
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  switch (parseInt(game.winCondition)) {
    case WinCondition.SingleLoser:
      return (
        <div className=" pb-6">
          <p className="p-4 text-xl">Select the loser</p>
          <div className="grid grid-cols-3 gap-4">
            {players.map((player: Player) => (
              <div key={player.id} className="flex flex-col items-center">
                <input
                  type="radio"
                  id={player.id}
                  name="loser"
                  value={player.id}
                  required
                  className="hidden"
                />
                <label htmlFor={player.id} className="relative">
                  <Image
                    src={player.avatar}
                    alt={player.name}
                    width={50}
                    height={50}
                    className={`rounded-full ${
                      selectedPlayerId === player.id
                        ? "ring-4 ring-tunnel-snake-green"
                        : ""
                    }`}
                    onClick={() => setSelectedPlayerId(player.id)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      );

    case WinCondition.SinglerWinner:
      return (
        <div className=" pb-6">
          <p className="p-4 text-xl">Select the winner</p>
          <div className="grid grid-cols-3 gap-4">
            {players.map((player: Player) => (
              <div key={player.id} className="flex flex-col items-center">
                <input
                  type="radio"
                  id={player.id}
                  name="winner"
                  value={player.id}
                  required
                  className="hidden"
                />
                <label htmlFor={player.id} className="relative">
                  <Image
                    src={player.avatar}
                    alt={player.name}
                    width={50}
                    height={50}
                    className={`rounded-full ${
                      selectedPlayerId === player.id
                        ? "ring-4 ring-tunnel-snake-green"
                        : ""
                    }`}
                    onClick={() => setSelectedPlayerId(player.id)}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      );

    case WinCondition.TeamBased:
      return (
        <>
          <TeambasedRadio />
          <ul className="flex flex-col gap-2 m-4 w-[100%]">
            {players.map((player: Player) => (
              <PlayerRow key={player.id} player={player} game={game} />
            ))}
          </ul>
        </>
      );

    case WinCondition.LeaderBoard:
      return (
        <>
          <input
            type="hidden"
            id="contactChoice2"
            name="scoringDirection"
            value={game.scoringDirection}
            className=""
          />
          <ul className="flex flex-col gap-2 m-4 w-[100%]">
            {players.map((player: Player) => (
              <PlayerRow key={player.id} player={player} game={game} />
            ))}
          </ul>
        </>
      );

    case WinCondition.Coopratitive:
      return (
        <>
          <CooperativeRadio />
          <ul className="flex flex-col gap-2 m-4 w-[100%]">
            {players.map((player: Player) => (
              <PlayerRow key={player.id} player={player} game={game} />
            ))}
          </ul>
        </>
      );

    default:
      break;
  }

  return <></>;
}
