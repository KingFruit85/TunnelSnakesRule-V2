"use client";
import { useState } from "react";
import { addNewBoardGame } from "@/app/lib/db/games-actions";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

const CONDITIONS = [
  { value: "0", label: "Leaderboard", helper: "Everyone scores points" },
  { value: "1", label: "Team based", helper: "Teams compete, one team wins" },
  { value: "2", label: "Co-operative", helper: "Everyone wins or loses together" },
  { value: "3", label: "Single winner", helper: "One player wins" },
  { value: "4", label: "Single loser", helper: "One player loses" },
];

export default function AddGameForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState("");
  const [winCondition, setWinCondition] = useState("");
  const [direction, setDirection] = useState<"High" | "Low">("High");
  const isLeaderboard = winCondition === "0";
  const canSubmit = name.trim().length > 0 && winCondition !== "";

  return (
    <form action={addNewBoardGame} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      {isLeaderboard && <input type="hidden" name="scoringDirection" value={direction} />}

      <label className="text-[14px] font-medium text-text" htmlFor="gameName">
        Game name
      </label>
      <input
        id="gameName"
        name="gameName"
        type="text"
        required
        placeholder="e.g. Catan"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />

      <p className="mt-5 text-[14px] font-medium text-text">How is it won?</p>
      <div className="mt-2 flex flex-col">
        {CONDITIONS.map((condition) => (
          <label
            key={condition.value}
            className="-mt-px flex items-start gap-3 border border-divider px-3 py-3 first:mt-0"
          >
            <input
              type="radio"
              name="winCondition"
              value={condition.value}
              required
              checked={winCondition === condition.value}
              onChange={() => setWinCondition(condition.value)}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span>
              <span className="block text-[14px] font-semibold text-text">{condition.label}</span>
              <span className="block text-[12.5px] text-text opacity-60">{condition.helper}</span>
            </span>
          </label>
        ))}
      </div>

      {isLeaderboard && (
        <div className="mt-3 flex border border-divider">
          {(["High", "Low"] as const).map((dir) => (
            <button
              type="button"
              key={dir}
              onClick={() => setDirection(dir)}
              className={`flex-1 py-2 text-[13px] font-semibold ${
                direction === dir ? "bg-accent text-white" : "bg-canvas text-text"
              }`}
            >
              {dir} score wins
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block disabled={!canSubmit}>
          Add game
        </SubmitButton>
        <LinkButton href={`/clubs/${clubId}`} variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
