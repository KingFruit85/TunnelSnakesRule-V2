"use client";
import { addNewBoardGame } from "@/app/lib/actions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";
import { WinCondition } from "@/app/lib/definitions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import LeaderboardRadio from "./Results/leaderboardradio";

export default function AddNewGame() {
  const searchParams = useSearchParams();

  const clubId = searchParams.get("clubId");

  const [leaderboardSelected, setLeaderboardSelected] =
    useState<boolean>(false);

  return (
    <form
      action={addNewBoardGame}
      className="border p-4 bg-black flex flex-col items-start w-[95%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%]"
    >
      <input type="hidden" name={"clubId"} value={clubId || ""} />

      <div className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl text-center font-semibold flex items-center text-lime-400">
        Add New Game
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-2">
          <div className="font-['Montserrat']">Name</div>
          <input
            id="gameName"
            name="gameName"
            type="text"
            required
            className="bg-tunnel-snake-grey border p-2"
          />
        </div>

        <div className=" pt-4 pb-2 flex flex-col gap-2">
          <div className="font-['Montserrat']">Win conditions</div>

          <div className="flex gap-2 font-['Montserrat']">
            <input
              type="radio"
              name="winCondition"
              id="teamBased"
              value={WinCondition.TeamBased}
              onClick={() => setLeaderboardSelected(false)}
              className=""
            />
            <div className="">Team based</div>
          </div>
          <div className="flex gap-2 font-['Montserrat']">
            <input
              type="radio"
              name="winCondition"
              id="cooperative"
              value={WinCondition.Coopratitive}
              onClick={() => setLeaderboardSelected(false)}
              className=""
            />
            <div className="">Co-operative</div>
          </div>

          <div className="flex gap-2 font-['Montserrat']">
            <input
              type="radio"
              name="winCondition"
              id="leaderBoard"
              value={WinCondition.LeaderBoard}
              onClick={() => setLeaderboardSelected(true)}
              className=""
            />
            <div className="">Leader board</div>
          </div>

          {leaderboardSelected && (
            <div className="flex items-center p-4 border border-tunnel-snake-orange">
              <LeaderboardRadio />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 mb-4 w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] flex flex-col gap-4 items-center">
        <SubmitButton label={"Add Game"} />
        <CancelButton />
      </div>
    </form>
  );
}
