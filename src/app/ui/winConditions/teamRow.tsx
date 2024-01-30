import React, { useState } from "react";
import { Player } from "@/app/lib/definitions";

export interface TeamRowProps {
  players: Player[];
}

export default function TeamRow(props: TeamRowProps) {
  return (
    <>
      <div className="flex gap-5">
        <input
          id="teamName"
          className="w-[172px] h-8 bg-neutral-900 rounded-sm border border-white"
        />
        <input
          id="players"
          className="w-[172px] h-8 top-0 bg-neutral-900 rounded-sm border border-white"
        />
        <div
          id="score"
          className="w-[72px] h-8 bg-neutral-900 rounded-sm border border-white"
        />
        <input
          type="radio"
          name="winningteam"
          className=" w-6 h-6 ml-2 bg-neutral-900 rounded-[29px] border-white"
        />
      </div>
    </>
  );
}
