"use client";
import { useState } from "react";

export default function AddNewPlayer() {
  const [playerName, setPlayerName] = useState("");

  console.log(playerName);

  return (
    <div className="w-[496px] h-[481px] p-12 bg-tunnel-snake-black border border-white flex-col justify-start items-start gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Add New Player
      </div>
      <div className="flex-col justify-start items-start gap-10 flex">
        <div className=" h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Player name
          </div>
          <input
            onChange={(e) => setPlayerName(e.target.value)}
            className="self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex"
          />
        </div>
        <div className="flex-col justify-start items-start gap-5 flex">
          <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex">
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add player
            </div>
          </button>
          <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">
              Cancel
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
