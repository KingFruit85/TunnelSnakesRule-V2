"use client";
import { useState } from "react";

export default function AddNewGame() {
  const [winCondition, setWinCondition] = useState("teamBased");
  const [gameName, setGameName] = useState("");
  const [coverArtUrl, setCoverArtUrl] = useState("");

  console.log(gameName);

  const handleRadioChange = (value:any) => {
    setWinCondition(value);
  };

  return (
    <div className=" p-12 bg-tunnel-snake-black border border-white flex-col justify-start items-start gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Add New Game
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Name
          </div>
          <input onChange={(e) => setGameName(e.target.value)}  className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex" />
        </div>
        <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Cover art URL
          </div>
          <input onChange={(e) => setCoverArtUrl(e.target.value)} className="self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex" />
        </div>
        <div className="flex-col justify-start items-start gap-4 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Win conditions
          </div>
          <div className="flex-col justify-start items-start gap-5 flex">
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="teamBased"
                value="teamBased"
                onChange={() => handleRadioChange("teamBased")}
                checked={winCondition === "teamBased"}
                className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Team based
              </div>
            </div>
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="cooperative"
                value="cooperative"
                checked={winCondition === "cooperative"}
                onChange={() => handleRadioChange("cooperative")}
                className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Co-operative
              </div>
            </div>
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="leaderBoard"
                value="leaderBoard"
                checked={winCondition === "leaderBoard"}
                onChange={() => handleRadioChange("leaderBoard")}
                className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Leader board
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex">
          <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
            Add game
          </div>
        </button>
        <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
          <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">
            Cancel
          </div>
        </button>
      </div>
    </div>
  );
}
