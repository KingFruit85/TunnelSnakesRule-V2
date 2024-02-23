"use client";

import {
  addPlayerToClub,
} from "@/app/lib/actions";
import { Player } from "@/app/lib/definitions";
import { UUID } from "crypto";
import Image from "next/image";

export interface ClubAccessRequestsProps {
  players: Player[];
  clubId: string;
}

export default function ClubAccessRequests({
  players,
  clubId,
}: ClubAccessRequestsProps) {
  const handleApprove = (player: Player) => {
    console.log("player", player);
    addPlayerToClub(player.externalId, clubId as UUID);
  };
  const handleDecline = (player: Player) => {};

  return (
    <div className=" p-4 bg-black flex flex-col items-start w-[95%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%]">
      <div
        className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl 
      text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
      >
        Access Requests
      </div>

      {players.map((player: Player) => (
        <div key={player.id} className="flex gap-4 p-4 items-center">
          <Image
            src={player.avatar}
            alt={player.name}
            className="rounded-full"
            width={40}
            height={40}
          />
          <p>{player.name}</p>
          <button
            name="approve"
            onClick={() => handleApprove(player)}
            type="button"
            className="flex gap-2 text-tunnel-snake-green border-tunnel-snake-green px-4 py-2 bg-tunnel-snake-black rounded-sm border hover:bg-tunnel-snake-green"
          >
            Approve
          </button>
          <button
            name="decline"
            type="button"
            className="flex gap-2 text-tunnel-snake-red border-tunnel-snake-red px-4 py-2 bg-tunnel-snake-black rounded-sm border hover:bg-tunnel-snake-red"
          >
            Decline
          </button>
        </div>
      ))}
    </div>
  );
}
