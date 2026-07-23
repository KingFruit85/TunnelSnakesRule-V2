"use client";
import { useState } from "react";
import { addNewGameSession } from "@/app/lib/db/sessions-actions";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

const MAX_CHARS = 25;

function todayLabel() {
  return new Date()
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    .slice(0, MAX_CHARS);
}

export default function NewSessionForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState(todayLabel());

  return (
    <form action={addNewGameSession} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      <label className="text-[14px] font-medium text-text" htmlFor="sessionName">
        Session name
      </label>
      <input
        id="sessionName"
        name="sessionName"
        type="text"
        required
        maxLength={MAX_CHARS}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />
      <p className="mt-1 self-end text-[13px] text-accent-700">
        {name.length} / {MAX_CHARS}
      </p>
      <p className="mt-2 text-[13px] text-text opacity-65">
        Dated today — {todayLabel()}. The session stays active until you close it.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block>Create session</SubmitButton>
        <LinkButton href={`/clubs/${clubId}`} variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
