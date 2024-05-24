"use client";

import { addNewClub } from "@/app/lib/actions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";

import { useAuth } from "@clerk/nextjs";

export default function AddNewClub() {
  const { userId } = useAuth();

  return (
    <form
      action={addNewClub}
      className="p-4 bg-black text-white flex flex-col items-start w-[95%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%] dark:bg-black text-white"
    >
      <div
        className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl 
      text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
      >
        Add New Club
      </div>

      <div className="p-4">
        <div className="mb-1 mt-1 font-['Montserrat']">Club name</div>

        <input
          id="clubName"
          name="clubName"
          type="text"
          required
          className="p-2 bg-tunnel-snake-grey border rounded-sm mb-4 mt-1 p-1 text-tunnel-snake-orange"
        />
      </div>

      <input type="hidden" name={"owner"} value={userId || ""} />

      <div className="mt-4 mb-4 w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] flex flex-col gap-4 items-center">
        <SubmitButton label={"Add Club"} />
        <CancelButton />
      </div>
    </form>
  );
}
