"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  addImageToPlayer,
  addNewPlayer,
  redirectBackToSessions,
} from "@/app/lib/actions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";
import { upload } from "@vercel/blob/client";

export default function AddNewPlayer() {
  const [playerName, setPlayerName] = useState("");
  const inputFileRef = useRef<HTMLInputElement>(null);

  

  return (
    <form
      onSubmit={async (event) => {

        console.log(event)
        debugger;
        // const newPlayerId = await addNewPlayer(event);
        const newPlayerId = "123";

        if (!inputFileRef.current?.files) {
          throw new Error("No file selected");
        }

        const file = inputFileRef.current.files[0];

        await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
          clientPayload: (newPlayerId as string) || "",
        });

        redirectBackToSessions();
      }}
      className="border p-4 bg-black flex flex-col items-start w-[95%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%]"
    >
      <div
        className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl 
      text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
      >
        Add New Player
      </div>

      <div className="p-4">
        <div className="mb-1 mt-1 font-['Montserrat']">Player name</div>

        <input
          id="playerName"
          name="playerName"
          required
          onChange={(e) => setPlayerName(e.target.value)}
          className="p-2 bg-tunnel-snake-grey border rounded-sm mb-4 mt-1 p-1 text-tunnel-snake-orange"
        />
      </div>

      <div className="p-4 flex flex-col items-start mt-1">
        <label
          htmlFor="file"
          className="mb-2 text-gray-400 font-['Montserrat']"
        >
          Choose a file
        </label>

        <div className="relative mb-4 mt-1">
          <input
            id="file"
            name="file"
            // ref={inputFileRef}
            type="file"
            className="hidden"
            required
          />
          <label
            htmlFor="file"
            className="cursor-pointer bg-tunnel-snake-grey border rounded-sm p-2 font-['Montserrat']"
          >
            Player image
          </label>
          <span className="ml-2" id="fileName font-['Montserrat']">
            No file chosen
          </span>
        </div>
      </div>

      <div className="mt-4 mb-4 w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] flex flex-col gap-4 items-center">
        <SubmitButton label={"Add Player"}  />
        <CancelButton  />
      </div>
    </form>
  );
}
