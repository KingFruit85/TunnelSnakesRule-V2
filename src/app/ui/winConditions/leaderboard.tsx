"use client";

import { Player } from "@/app/lib/definitions";
import PlayerRow from "./playerRow";

export interface LeaderboardProps {
  players: Player[];
  winCondition: string;
}

export default function Leaderboard(props: LeaderboardProps) {
  const { players, winCondition } = props;

  console.log('leaderboard players: ',players);

  return (
    <div className="flex-col justify-start items-center gap-3 flex mt-4">
      {winCondition === "leaderBoard" && (
        <fieldset>
        <div className="flex gap-4 mt-2 mb-2 text-white text-base font-normal font-['Montserrat'] bg-tunnel-snake-grey p-2 rounded-xl border border-tunnel-snake-green">
        <legend>Scoring direction </legend>
          <input
            type="radio"
            id="contactChoice1"
            name="scoringDirection"
            value="High"
            required
            className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
          />
          <label htmlFor="contactChoice1">High</label>

          <input
            type="radio"
            id="contactChoice2"
            name="scoringDirection"
            value="Low"
            className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
          />
          <label htmlFor="contactChoice2">Low</label>
        </div>
      </fieldset>
      )}

{winCondition === "cooperative" && (
        <fieldset>
        <div className="flex gap-4 mt-2 mb-2 text-white text-base font-normal font-['Montserrat'] bg-tunnel-snake-grey p-2 rounded-xl border border-tunnel-snake-green">
        <legend>Winner</legend>
          <input
            type="radio"
            id="contactChoice1"
            name="winner"
            value="Game"
            required
            className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
            onChange={() => console.log("Game")}
          />
          <label htmlFor="contactChoice1">Game</label>

          <input
            type="radio"
            id="contactChoice2"
            name="winner"
            value="Players"
            className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
          />
          <label htmlFor="contactChoice2">Players</label>
        </div>
      </fieldset>
      )}

{winCondition === "teamBased" && (
  <fieldset>
    <div className="flex flex-wrap gap-4 mt-2 mb-2 text-white text-base font-normal font-['Montserrat'] bg-tunnel-snake-grey p-2 rounded-xl border border-tunnel-snake-green">
      <legend>Winner</legend>

      <div className="flex items-center gap-2 ">
        <input
          type="radio"
          id="contactChoice1"
          name="winner"
          value="Team 1"
          className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
        />
        <label htmlFor="contactChoice1">Team 1</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="radio"
          id="contactChoice2"
          name="winner"
          value="Team 2"
          className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
        />
        <label htmlFor="contactChoice2">Team 2</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="radio"
          id="contactChoice3"
          name="winner"
          value="Team 3"
          className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
        />
        <label htmlFor="contactChoice3">Team 3</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="radio"
          id="contactChoice5"
          name="winner"
          value="Tie"
          className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
        />
        <label htmlFor="contactChoice5">Tie</label>
      </div>
    </div>
  </fieldset>
)}


      <div className="w-[482px] h-[17px] relative">
        <div className="left-0 top-0 absolute text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
          Players
        </div>
        <div className="left-[216px] top-0 absolute text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
          Score
        </div>
        {winCondition === "teamBased" && (<div className="left-[370px] top-0 absolute text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
          Team
        </div>)}
      </div>
      <div className="w-[481px] justify-start items-start gap-8 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-5 inline-flex">
          <div className="flex-col justify-start items-start gap-4 flex">
            <div className="flex-col justify-start items-start gap-5 flex">
              <ul className="space-y-5 ml-2">
                {players.map((player: Player) => (
                  <PlayerRow key={player.id} player={player} winCondition={winCondition}/>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
