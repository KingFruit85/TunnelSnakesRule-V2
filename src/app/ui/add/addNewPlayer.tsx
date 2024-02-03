"use client";
import { useRef, useState } from "react";
import { addImageToPlayer, addNewPlayer, redirectBackToSessions } from "@/app/lib/actions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";
import { PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";

export default function AddNewPlayer() {
  const [playerName, setPlayerName] = useState("");
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);


  return (
    <form
      action={ async (event) => {
        const newPlayerId = await addNewPlayer(event);

        if (!inputFileRef.current?.files) {
          throw new Error("No file selected");
        }

        const file = inputFileRef.current.files[0];

        const newBlob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/avatar/upload",
          clientPayload: newPlayerId as string || "",
        });

        setBlob(newBlob);

        await addImageToPlayer(newBlob.url, newPlayerId as string);

        redirectBackToSessions();
        
      }}
      className="border p-4 bg-black flex flex-col items-center"
    >
      <div className="text-3xl md:text-3xl lg:text-4xl xl:text-4xl text-center font-montserrat flex items-center text-tunnel-snake-white">
        Add New Player
      </div>

      <div className="mb-1 mt-1">Player name</div>

      <input
        id="playerName"
        name="playerName"
        onChange={(e) => setPlayerName(e.target.value)}
        className="bg-tunnel-snake-grey border rounded-sm mb-4 mt-1 p-1 text-tunnel-snake-orange"
      />

      <div className="flex flex-col items-center mt-1">
        <label htmlFor="file" className="mb-2 text-gray-400">
          Choose a file
        </label>

        <div className="relative mb-4 mt-1">
          <input
            id="file"
            name="file"
            ref={inputFileRef}
            type="file"
            className="hidden"
            required
          />
          <label
            htmlFor="file"
            className="cursor-pointer bg-tunnel-snake-grey border rounded-sm p-2"
          >
            Player image
          </label>
          <span className="ml-2" id="fileName">
            No file chosen
          </span>
        </div>
      </div>

      <div className="flex gap-4 p-2">
        <SubmitButton label={"Add Player"} />
        <CancelButton />
      </div>
    </form>
  );
}
