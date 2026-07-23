"use client";
import { useState } from "react";
import { addNewClub } from "@/app/lib/db/clubs-actions";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

export default function NewClubForm() {
  const [name, setName] = useState("");

  return (
    <form action={addNewClub} className="flex flex-1 flex-col px-5 pt-5">
      <label className="text-[14px] font-medium text-text" htmlFor="clubName">
        Club name
      </label>
      <input
        id="clubName"
        name="clubName"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />
      <p className="mt-3 text-[13px] text-text opacity-65">
        You&apos;ll be the owner. Players request to join, and you approve them from the club page.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block disabled={name.trim().length === 0}>
          Create club
        </SubmitButton>
        <LinkButton href="/clubs" variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
