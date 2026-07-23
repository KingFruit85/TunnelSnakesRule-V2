"use client";
import { addNewGameSession } from "@/app/lib/db/sessions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";
import { SetStateAction, useState } from "react";

export interface AddNewSessionProps {
  clubId: string;
}

export default function AddNewSession({ clubId }: AddNewSessionProps) {
  const [sessionName, setSessionName] = useState("");
  const maxChars = 25;

  const handleInputChange = (e: {
    target: { value: SetStateAction<string> };
  }) => {
    setSessionName(e.target.value);
  };

  const charsLeft = maxChars - sessionName.length;

  return (
    <form action={addNewGameSession}>
      <input type="hidden" name="clubId" value={clubId} />
      <div className=" bg-tunnel-snake-black flex-col justify-start items-start gap-8 inline-flex">
        <div className="text-white text-[32px] font-semibold font-['Montserrat']">
          Add New Session
        </div>
        <div className="flex-col justify-start items-start gap-5 flex">
          <div className="flex-col justify-start items-start gap-2 flex">
            <div className="text-white text-sm font-medium ">Session name</div>
            <input
              id="sessionName"
              name="sessionName"
              type="text"
              required
              value={sessionName}
              onChange={handleInputChange}
              maxLength={maxChars}
              className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex text-white dark:text-white"
            />
            <div className=" font-['Montserrat'] flex w-[100%] justify-end text-sm text-tunnel-snake-orange">
              {charsLeft} / {maxChars}
            </div>
          </div>
        </div>
        <div className="mt-4 mb-4 w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] flex flex-col gap-4 items-center">
          <SubmitButton label={"Create session"} />
          <CancelButton />
        </div>
      </div>
    </form>
  );
}
