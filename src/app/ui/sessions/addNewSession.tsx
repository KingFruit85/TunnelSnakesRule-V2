"use client";
import { useState } from "react";

export default function AddNewSession() {
    const [sessionName, setSessionName] = useState("");
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    console.log(selectedPlayers);

    const handleCheckboxChange = (playerName: string) => {
      setSelectedPlayers((prevSelectedPlayers: any) => {
        if (prevSelectedPlayers.includes(playerName)) {
          // Remove the player from the array
          return prevSelectedPlayers.filter(
            (player: string) => player !== playerName
          );
        } else {
          // Add the player to the array
          return [...prevSelectedPlayers, playerName];
        }
      });
    };
    return (
        <div className="w-[496px] h-[749px] p-12 bg-black border border-white flex-col justify-start items-start gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">Add New Session</div>
      <div className="flex-col justify-start items-start gap-5 flex">
          <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
              <div className="text-white text-sm font-medium font-['Montserrat']">Session name</div>
              <input onChange={(e) => setSessionName(e.target.value)}  className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex" />
          </div>
          <div className="flex-col justify-start items-start gap-4 flex">
              <div className="text-white text-sm font-medium font-['Montserrat']">Players</div>
              <div className="flex-col justify-start items-start gap-5 flex">
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input onChange={() => handleCheckboxChange('')} type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Dominick</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Dan</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Evil Chris</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Girl Chris</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Holly</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Mark</div>
                  </div>
                  <div className="justify-start items-center gap-3 inline-flex">
                      <input type="checkbox" className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm" />
                      <div className="text-white text-base font-normal font-['Montserrat']">Paige</div>
                  </div>
              </div>
          </div>
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
          <button className="w-[400px] px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex">
              <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">Create session</div>
          </button>
          <button className="w-[400px] px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
              <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">Cancel</div>
          </button>
      </div>
  </div>
      );
};