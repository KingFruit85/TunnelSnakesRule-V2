"use client";

import { GroupedBoardgameTotalPlays } from "@/app/lib/data";
import { Player } from "@/app/lib/definitions";
import { Table } from "@geist-ui/core";
import Image from "next/image";

export interface PlayerPageProps {
  player: Player;
  playerEvents: GroupedBoardgameTotalPlays;
}

export default function PlayerPage({ player, playerEvents }: PlayerPageProps) {
  // get a list of all games played by the player

  const data = Object.entries(playerEvents).map(([gameName, total]) => ({
    gameName,
    total,
  }));

  // const data = [
  //   {
  //     property: "type",
  //     description: "Content type",
  //     type: "secondary | warning",
  //     default: "-",
  //   },
  //   {
  //     property: "Component",
  //     description: "DOM element to use",
  //     type: "string",
  //     default: "-",
  //   },
  //   {
  //     property: "bold",
  //     description: "Bold style",
  //     type: "boolean",
  //     default: "true",
  //   },
  // ];

  return (
    <div>
      <div className=" gap-4 flex flex-col items-center bg-black text-white dark:bg-black text-white">
        <Image
          className="border border-black rounded-full"
          key={player.id}
          src={player.avatar}
          alt={player.name}
          width={100}
          height={100}
        />

        <Table data={data}>
          <Table.Column prop="gameName" label="gameName" />
          <Table.Column prop="total" label="total" />
        </Table>
      </div>
    </div>
  );
}
