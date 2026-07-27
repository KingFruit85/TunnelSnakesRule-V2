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
  {
    value: "5",
    label: "Hidden traitor",
    helper: "One or more players may secretly work against the rest",
  },
  {
    value: "6",
    label: "Team scored",
    helper: "Teams compete, highest or lowest team score wins",
  },
];

export default function AddGameForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState("");
  const [winCondition, setWinCondition] = useState("");
  const [direction, setDirection] = useState<"High" | "Low">("High");
  const [roleOneLabel, setRoleOneLabel] = useState("");
  const [roleTwoLabel, setRoleTwoLabel] = useState("");
  const [neitherLabel, setNeitherLabel] = useState("");
  const isLeaderboard = winCondition === "0";
  const isHiddenTraitor = winCondition === "5";
  const needsDirection = winCondition === "0" || winCondition === "6";
  const hiddenTraitorLabels = [roleOneLabel.trim(), roleTwoLabel.trim(), neitherLabel.trim()];
  const hiddenTraitorLabelsValid =
    hiddenTraitorLabels.every((label) => label.length > 0) &&
    new Set(hiddenTraitorLabels).size === hiddenTraitorLabels.length;
  const canSubmit =
    name.trim().length > 0 && winCondition !== "" && (!isHiddenTraitor || hiddenTraitorLabelsValid);

  return (
    <form action={addNewBoardGame} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      {needsDirection && <input type="hidden" name="scoringDirection" value={direction} />}
      {isHiddenTraitor && (
        <>
          <input type="hidden" name="roleOneLabel" value={roleOneLabel} />
          <input type="hidden" name="roleTwoLabel" value={roleTwoLabel} />
          <input type="hidden" name="neitherLabel" value={neitherLabel} />
        </>
      )}

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

      {needsDirection && (
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

      {isHiddenTraitor && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="text-[13px] font-medium text-text" htmlFor="roleOneLabel">
              Role one
            </label>
            <input
              id="roleOneLabel"
              type="text"
              placeholder="e.g. Heroes"
              value={roleOneLabel}
              onChange={(e) => setRoleOneLabel(e.target.value)}
              className="mt-1 w-full border border-divider bg-surface px-3 py-2 text-[14px] text-text"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-text" htmlFor="roleTwoLabel">
              Role two
            </label>
            <input
              id="roleTwoLabel"
              type="text"
              placeholder="e.g. Traitor"
              value={roleTwoLabel}
              onChange={(e) => setRoleTwoLabel(e.target.value)}
              className="mt-1 w-full border border-divider bg-surface px-3 py-2 text-[14px] text-text"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-text" htmlFor="neitherLabel">
              If neither role wins
            </label>
            <input
              id="neitherLabel"
              type="text"
              placeholder="e.g. The house wins"
              value={neitherLabel}
              onChange={(e) => setNeitherLabel(e.target.value)}
              className="mt-1 w-full border border-divider bg-surface px-3 py-2 text-[14px] text-text"
            />
          </div>
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
