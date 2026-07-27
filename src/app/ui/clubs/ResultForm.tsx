"use client";
import { useState } from "react";
import { recordPlayResults, updatePlayResults } from "@/app/lib/db/results-actions";
import { BoardGame, Player, NO_WINNER_SENTINEL } from "@/app/lib/definitions";
import type { PlayEditData } from "@/app/lib/db/results";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";
import Combobox from "@/app/ui/ds/Combobox";

// BoardGame.winCondition is the UI-coded string ("0".."5") already produced
// by getAllBoardgames via WIN_CONDITION_DB_TO_UI - matching the same codes
// AddGameForm's radio values already use, so no new mapping is invented
// here, just reused.
const WIN_LABELS: Record<string, string> = {
  "0": "Leaderboard",
  "1": "Team based",
  "2": "Co-operative",
  "3": "Single winner",
  "4": "Single loser",
  "5": "Hidden traitor",
  "6": "Team scored",
};

export interface ResultFormProps {
  mode: "add" | "edit";
  sessionId: string;
  clubId: string;
  playId?: string;
  games: BoardGame[];
  members: Player[];
  initialData: PlayEditData | null;
}

export default function ResultForm({
  mode,
  sessionId,
  clubId,
  playId,
  games,
  members,
  initialData,
}: ResultFormProps) {
  const [gameId, setGameId] = useState(initialData?.gameId ?? games[0]?.id ?? "");
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(members.map((m) => [m.id, initialData ? initialData.participantIds.includes(m.id) : true]))
  );
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, String(initialData?.scoresByPlayerId[m.id] ?? "")]))
  );
  const selectedGame = games.find((g) => g.id === gameId);
  const winCode = selectedGame?.winCondition ?? "";
  const roleOneLabel = selectedGame?.roleOneLabel ?? "Role one";
  const roleTwoLabel = selectedGame?.roleTwoLabel ?? "Role two";
  const neitherLabel = selectedGame?.neitherLabel ?? "Neither";
  const editTeamLabels = initialData ? [...new Set(Object.values(initialData.teamByPlayerId))].sort() : [];
  const [teamLabels] = useState<[string, string]>(
    editTeamLabels.length === 2 ? (editTeamLabels as [string, string]) : ["A", "B"]
  );
  const [teams, setTeams] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      members.map((m) => [
        m.id,
        initialData?.teamByPlayerId[m.id] ?? (winCode === "5" ? roleOneLabel : teamLabels[0]),
      ])
    )
  );
  const [winningTeam, setWinningTeam] = useState(
    initialData?.winningTeam ?? (winCode === "5" ? NO_WINNER_SENTINEL : "Tie")
  );
  const [coopWon, setCoopWon] = useState(initialData?.cooperativeWon ?? true);
  const [pickedPlayerId, setPickedPlayerId] = useState(initialData?.pickedPlayerId ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const selectedMembers = members.filter((m) => checked[m.id]);

  const validationError = (() => {
    if (selectedMembers.length === 0) return "Select at least one player.";
    if (
      (winCode === "0" || winCode === "6") &&
      selectedMembers.some((m) => scores[m.id].trim() === "" || Number.isNaN(Number(scores[m.id])))
    ) {
      return "Enter a score for every player.";
    }
    if (winCode === "3" && (!pickedPlayerId || !checked[pickedPlayerId])) {
      return "Pick the winner.";
    }
    if (winCode === "4" && (!pickedPlayerId || !checked[pickedPlayerId])) {
      return "Pick the loser.";
    }
    if (winCode === "5" && selectedMembers.some((m) => teams[m.id] !== roleOneLabel && teams[m.id] !== roleTwoLabel)) {
      return "Assign every player to a role.";
    }
    if (
      winCode === "5" &&
      winningTeam !== NO_WINNER_SENTINEL &&
      winningTeam !== roleOneLabel &&
      winningTeam !== roleTwoLabel
    ) {
      // winningTeam is seeded once at mount and not reset on a later game
      // switch (same staleness class as the teams check above) - without
      // this, switching from a different win condition/game after mount
      // could leave a stale value here that matches neither role nor the
      // sentinel, silently writing won: false for every player with no
      // error shown.
      return "Pick who won.";
    }
    return null;
  })();

  const action = mode === "edit" ? updatePlayResults.bind(null, playId as string) : recordPlayResults;

  return (
    <form action={action} className="flex flex-1 flex-col px-5 pt-5 pb-8">
      {mode === "add" && <input type="hidden" name="sessionId" value={sessionId} />}
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="gameResultNotes" value={notes} />

      {winCode === "1" && <input type="hidden" name="winner" value={winningTeam} />}
      {winCode === "2" && <input type="hidden" name="winner" value={coopWon ? "Players" : "Game"} />}
      {winCode === "3" && <input type="hidden" name="winner" value={pickedPlayerId} />}
      {winCode === "4" && <input type="hidden" name="loser" value={pickedPlayerId} />}
      {winCode === "5" && <input type="hidden" name="winner" value={winningTeam} />}

      {(winCode === "0" || winCode === "1" || winCode === "2" || winCode === "6") &&
        selectedMembers.map((m) => {
          const csv =
            winCode === "0"
              ? `true,${scores[m.id] || "0"},`
              : winCode === "1"
                ? `true,,${teams[m.id]}`
                : winCode === "6"
                  ? `true,${scores[m.id] || "0"},${teams[m.id]}`
                  : `true,,`;
          return <input key={m.id} type="hidden" name={`player_${m.id}`} value={csv} />;
        })}
      {winCode === "5" &&
        selectedMembers.map((m) => (
          <input key={m.id} type="hidden" name={`player_${m.id}`} value={`true,,${teams[m.id]}`} />
        ))}
      {(winCode === "3" || winCode === "4") &&
        selectedMembers.map((m) => <input key={m.id} type="hidden" name="participant" value={m.id} />)}

      <label className="text-[14px] font-medium text-text" htmlFor="game">
        Game
      </label>
      <div className="mt-2">
        <Combobox
          id="game"
          value={gameId}
          onChange={setGameId}
          options={games.map((g) => ({ id: g.id, label: g.name }))}
          placeholder="Search games…"
        />
      </div>
      {selectedGame && (
        <p className="mt-2 inline-block w-fit border border-accent-700 px-2 py-0.5 text-[12px] font-semibold text-accent-700">
          {WIN_LABELS[winCode]}
          {winCode === "0" && selectedGame.scoringDirection ? ` · ${selectedGame.scoringDirection.toLowerCase()} wins` : ""}
        </p>
      )}

      <p className="mt-5 text-[14px] font-medium text-text">Who played?</p>
      <div className="mt-2 flex flex-col gap-2">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={checked[m.id] ?? false}
              onChange={(e) => setChecked((prev) => ({ ...prev, [m.id]: e.target.checked }))}
              className="h-[18px] w-[18px] accent-accent"
            />
            <span className="text-[14px] text-text">{m.name}</span>
          </label>
        ))}
      </div>

      {(winCode === "0" || winCode === "6") && selectedMembers.length > 0 && (
        <div className="mt-5">
          <p className="text-[14px] font-medium text-text">
            Scores — {selectedGame?.scoringDirection === "Low" ? "lowest" : "highest"}{" "}
            {winCode === "6" ? "team total" : "score"} wins
          </p>
          <div className="mt-2 flex flex-col">
            {selectedMembers.map((m) => (
              <div
                key={m.id}
                className="-mt-px flex items-center justify-between border border-divider px-3 py-2 first:mt-0"
              >
                <label htmlFor={`score-${m.id}`} className="text-[14px] text-text">
                  {m.name}
                </label>
                <input
                  id={`score-${m.id}`}
                  type="number"
                  value={scores[m.id] ?? ""}
                  onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  className="w-20 border border-divider bg-surface px-2 py-1 text-right text-[14px] text-text"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {(winCode === "1" || winCode === "6") && selectedMembers.length > 0 && (
        <div className="mt-5">
          <p className="text-[14px] font-medium text-text">Teams</p>
          <div className="mt-2 flex flex-col gap-2">
            {selectedMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-[14px] text-text">{m.name}</span>
                <div className="flex border border-divider">
                  {teamLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={teams[m.id] === label}
                      aria-label={`Assign ${m.name} to Team ${label}`}
                      onClick={() => setTeams((prev) => ({ ...prev, [m.id]: label }))}
                      className={`px-3 py-1 text-[13px] font-semibold ${
                        teams[m.id] === label ? "bg-accent text-white" : "bg-canvas text-text"
                      }`}
                    >
                      Team {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {winCode === "1" && (
            <>
              <p className="mt-3 text-[14px] font-medium text-text">Winning team</p>
              <div className="mt-2 flex border border-divider">
                {teamLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setWinningTeam(label)}
                    className={`flex-1 py-2 text-[13px] font-semibold ${
                      winningTeam === label ? "bg-accent text-white" : "bg-canvas text-text"
                    }`}
                  >
                    Team {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWinningTeam("Tie")}
                  className={`flex-1 py-2 text-[13px] font-semibold ${
                    winningTeam === "Tie" ? "bg-accent text-white" : "bg-canvas text-text"
                  }`}
                >
                  Tie
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {winCode === "2" && (
        <div className="mt-5 flex border border-divider">
          {[
            { value: true, label: "Everyone won" },
            { value: false, label: "The game won" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setCoopWon(opt.value)}
              className={`flex-1 py-2 text-[13px] font-semibold ${
                coopWon === opt.value ? "bg-accent text-white" : "bg-canvas text-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {(winCode === "3" || winCode === "4") && selectedMembers.length > 0 && (
        <div className="mt-5">
          <p className="text-[14px] font-medium text-text">{winCode === "3" ? "Who won?" : "Who lost?"}</p>
          <div className="mt-2 flex flex-col">
            {selectedMembers.map((m) => (
              <label
                key={m.id}
                className="-mt-px flex items-center gap-3 border border-divider px-3 py-2.5 first:mt-0"
              >
                <input
                  type="radio"
                  name="pickedPlayerRadioGroup"
                  checked={pickedPlayerId === m.id}
                  onChange={() => setPickedPlayerId(m.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-[14px] text-text">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {winCode === "5" && selectedMembers.length > 0 && (
        <div className="mt-5">
          <p className="text-[14px] font-medium text-text">Roles</p>
          <div className="mt-2 flex flex-col gap-2">
            {selectedMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-[14px] text-text">{m.name}</span>
                <div className="flex border border-divider">
                  {[roleOneLabel, roleTwoLabel].map((label) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={teams[m.id] === label}
                      aria-label={`Assign ${m.name} to ${label}`}
                      onClick={() => setTeams((prev) => ({ ...prev, [m.id]: label }))}
                      className={`px-3 py-1 text-[13px] font-semibold ${
                        teams[m.id] === label ? "bg-accent text-white" : "bg-canvas text-text"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[14px] font-medium text-text">Who won?</p>
          <div className="mt-2 flex border border-divider">
            {[roleOneLabel, roleTwoLabel].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setWinningTeam(label)}
                className={`flex-1 py-2 text-[13px] font-semibold ${
                  winningTeam === label ? "bg-accent text-white" : "bg-canvas text-text"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWinningTeam(NO_WINNER_SENTINEL)}
              className={`flex-1 py-2 text-[13px] font-semibold ${
                winningTeam === NO_WINNER_SENTINEL ? "bg-accent text-white" : "bg-canvas text-text"
              }`}
            >
              {neitherLabel}
            </button>
          </div>
        </div>
      )}

      <label className="mt-5 text-[14px] font-medium text-text" htmlFor="resultNotes">
        Notes (optional)
      </label>
      <textarea
        id="resultNotes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />

      {validationError && <p className="mt-3 text-[13px] text-accent-700">{validationError}</p>}

      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block disabled={!!validationError}>
          {mode === "edit" ? "Save changes" : "Save result"}
        </SubmitButton>
        <LinkButton href={`/clubs/${clubId}/sessions/${sessionId}`} variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
