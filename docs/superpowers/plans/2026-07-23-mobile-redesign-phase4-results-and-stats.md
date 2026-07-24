# Mobile Redesign — Phase 4: Add/Edit Result & Club Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the redesigned Add/Edit Result screen (retiring the `/add/result` bridge every earlier phase's Session Detail screen has relied on) and the real Club Stats screen (replacing the "coming soon" placeholder Phase 2 shipped). This is the last piece of the originally-scoped mobile redesign.

**Architecture:** A single shared client component (`ResultForm`) handles both "Add result" and "Edit result" — the two screens differ only in which server action they bind to (`recordPlayResults` vs. `updatePlayResults.bind(null, playId)`) and whether they're seeded with existing play data. A new read function, `getPlayForEdit`, rehydrates that existing data by inspecting whichever of the three result tables (`leaderboard_results`/`team_results`/`outcome_results`) actually has rows for the play, using `resolveEffectiveRules` (not the base game's own fields) to disambiguate cooperative/single_winner/single_loser — all three write to `outcome_results` and are otherwise indistinguishable without knowing the game's actual effective win condition, the same lesson already applied in `getSessionPlaySummaries` and `getClubStats`. The form's hidden-input wire format is dictated entirely by the *existing* `results-actions.ts` parsing logic (`writeResultRows`/`parseCheckedPlayers`), which is **not** modified by this phase — the new UI must produce exactly the field shapes that code already expects. Club Stats needs no new data-layer work at all; `getClubStats` (Phase 1) already computes everything the screen shows.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Clerk auth, the established `src/app/ui/ds/` design-token component library. Testing follows the same convention as every prior phase: `scripts/verify-data-layer.js` for the new pure-read function (TDD, red-then-green), `npm run build` for everything else. Every new `[clubId]`-scoped route gets its membership check from the first commit, per the lesson learned (and, in one case, learned twice) in earlier phases.

---

## The existing wire format `ResultForm` must produce

This isn't something this phase gets to design — it's dictated by `src/app/lib/db/results-actions.ts`'s existing `parseCheckedPlayers`/`writeResultRows`, unchanged by this phase. Documented here once so every task below can reference it instead of re-deriving it:

- **leaderboard / team_based / cooperative**: one hidden input per *checked* player, `name="player_${playerId}"`, `value="true,<score>,<team>"` (comma-joined; empty string for whichever of score/team doesn't apply — `parseCheckedPlayers` splits on `,` and only reads the first field to decide inclusion, so trailing empty segments are harmless).
- **team_based** additionally needs `name="winner"` = the winning team's label (must exactly match one of the submitted `team` values), or `"Tie"` for no winner.
- **cooperative** additionally needs `name="winner"` = `"Players"` (everyone won) or anything else, e.g. `"Game"` (the game won) — `writeResultRows` only checks `outcome === "Players"`.
- **single_winner / single_loser**: participation is expressed differently — one `name="participant"` input per checked player (`value=playerId`, no CSV scheme at all), plus `name="winner"` (single_winner) or `name="loser"` (single_loser) = the picked player's id.
- All conditions: `name="gameId"`, `name="gameResultNotes"`. New plays additionally need `name="sessionId"` (edits don't — `updatePlayResults` derives the session from the existing play, a play can't move sessions).
- **`scoringDirection` is never read from form data** — `resolveEffectiveRules(clubId, gameId)` resolves it server-side from the DB. Don't submit it (the old, pre-redesign form did, but the value was always ignored).

---

### Task 1: `getPlayForEdit` — rehydrate a play's raw result data

**Files:**
- Modify: `src/app/lib/db/results.ts`
- Modify: `scripts/verify-data-layer.js`

**Step 1: Write the failing test first**

Read `scripts/verify-data-layer.js` in full to confirm its current exact state (it should end its `try` block right after the `results.ts getSessionPlaySummaries OK...` line). Add this new section immediately after it, before the `} finally {` line:

```js
    // ------------------------------------------------------------------
    // 8. results.ts - getPlayForEdit. Reuses club/player fixtures already
    //    in scope; adds one leaderboard play and one team_based play to a
    //    fresh session so this section doesn't disturb section 6/7's own
    //    wins/played counts or summary assertions.
    // ------------------------------------------------------------------
    const [editSession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Edit Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(editSession.id);

    const [editPlayLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: editSession.id, gameId: gameLeaderboard.id, notes: `${MARKER}-edit notes` })
      .returning();
    fixtures.playIds.push(editPlayLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: editPlayLeaderboard.id, playerId: ownerPlayer.id, score: 15 },
      { playId: editPlayLeaderboard.id, playerId: memberPlayer.id, score: 30 },
    ]);

    const [editPlayTeam] = await db
      .insert(schema.plays)
      .values({ sessionId: editSession.id, gameId: gameTeamBased.id })
      .returning();
    fixtures.playIds.push(editPlayTeam.id);
    await db.insert(schema.teamResults).values([
      { playId: editPlayTeam.id, playerId: ownerPlayer.id, team: 'Red', won: false },
      { playId: editPlayTeam.id, playerId: memberPlayer.id, team: 'Blue', won: true },
    ]);

    const leaderboardEdit = await results.getPlayForEdit(club.id, editPlayLeaderboard.id);
    assert(leaderboardEdit, 'getPlayForEdit should find the leaderboard play');
    assertEqual(leaderboardEdit.gameId, gameLeaderboard.id, 'leaderboard edit data should resolve the right game');
    assertEqual(leaderboardEdit.notes, `${MARKER}-edit notes`, 'leaderboard edit data should carry play notes through');
    assertEqual(leaderboardEdit.winCondition, 'leaderboard', 'leaderboard edit data should resolve effective win condition');
    assertEqual(leaderboardEdit.scoresByPlayerId[ownerPlayer.id], 15, 'leaderboard edit data should carry owner score');
    assertEqual(leaderboardEdit.scoresByPlayerId[memberPlayer.id], 30, 'leaderboard edit data should carry member score');
    assertSameSet(
      leaderboardEdit.participantIds,
      [ownerPlayer.id, memberPlayer.id],
      'leaderboard edit data should list both participants'
    );

    const teamEdit = await results.getPlayForEdit(club.id, editPlayTeam.id);
    assert(teamEdit, 'getPlayForEdit should find the team play');
    assertEqual(teamEdit.winCondition, 'team_based', 'team edit data should resolve effective win condition');
    assertEqual(teamEdit.teamByPlayerId[ownerPlayer.id], 'Red', 'team edit data should carry owner team assignment');
    assertEqual(teamEdit.teamByPlayerId[memberPlayer.id], 'Blue', 'team edit data should carry member team assignment');
    assertEqual(teamEdit.winningTeam, 'Blue', 'team edit data should identify the winning team from the won:true row');

    const missingEdit = await results.getPlayForEdit(club.id, '00000000-0000-0000-0000-000000000000');
    assertEqual(missingEdit, null, 'getPlayForEdit should return null for a play id that does not exist');
    console.log('results.ts getPlayForEdit OK (leaderboard rehydration, team rehydration, missing play)');
```

Sanity-check the fixture arithmetic yourself against what's already in scope earlier in the file (`club`, `ownerPlayer`, `memberPlayer`, `gameLeaderboard`, `gameTeamBased` — all established in earlier sections) before proceeding. If a name doesn't match what's actually in the file, STOP and report the discrepancy rather than adjusting silently — this exact plan has had two prior variable-collision surprises in earlier phases, both caught this way.

- [ ] **Step 2: Run the script to confirm it fails for the right reason**

Run: `npm run db:verify-layer`

Expected: fails with an error indicating `getPlayForEdit` is not a function on the compiled `results.js` module.

- [ ] **Step 3: Implement `getPlayForEdit`**

In `src/app/lib/db/results.ts`, add this new exported type and function (after `getSessionPlaySummaries`):

```ts
export type PlayEditData = {
  gameId: string;
  notes: string;
  winCondition: EffectiveRules["winCondition"];
  scoringDirection: EffectiveRules["scoringDirection"];
  participantIds: string[];
  scoresByPlayerId: Record<string, number>;
  teamByPlayerId: Record<string, string>;
  winningTeam: string | null;
  cooperativeWon: boolean | null;
  pickedPlayerId: string | null;
};

// Rehydrates an existing play's raw result data for the Edit result screen.
// Reads whichever ONE of the three result tables actually has rows for this
// play (recordPlayResults/updatePlayResults only ever write to one), and -
// critically - uses resolveEffectiveRules to tell cooperative apart from
// single_winner/single_loser, since all three write to outcome_results and
// are otherwise indistinguishable. Same reasoning already applied in
// getSessionPlaySummaries and getClubStats: never trust the base game's own
// winCondition/scoringDirection directly, always resolve club variants.
//
// Scoped by clubId as well as playId, joined through the play's session -
// same reasoning as getSessionDetails/getSessionPlaySummaries's fix: without
// this, a caller could read another club's play data (scores, notes) by
// pairing its own clubId with a different club's playId. A mismatched pair
// returns null instead of leaking data.
export async function getPlayForEdit(clubId: string, playId: string): Promise<PlayEditData | null> {
  const [play] = await db
    .select({ id: plays.id, gameId: plays.gameId, notes: plays.notes })
    .from(plays)
    .innerJoin(sessions, eq(plays.sessionId, sessions.id))
    .where(and(eq(plays.id, playId), eq(sessions.clubId, clubId)));
  if (!play) {
    return null;
  }

  const rules = await resolveEffectiveRules(clubId, play.gameId);
  const base = {
    gameId: play.gameId,
    notes: play.notes ?? "",
    winCondition: rules.winCondition,
    scoringDirection: rules.scoringDirection,
  };

  if (rules.winCondition === "leaderboard") {
    const rows = await db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, playId));
    return {
      ...base,
      participantIds: rows.map((r) => r.playerId),
      scoresByPlayerId: Object.fromEntries(rows.map((r) => [r.playerId, r.score])),
      teamByPlayerId: {},
      winningTeam: null,
      cooperativeWon: null,
      pickedPlayerId: null,
    };
  }

  if (rules.winCondition === "team_based") {
    const rows = await db.select().from(teamResults).where(eq(teamResults.playId, playId));
    const winningRow = rows.find((r) => r.won);
    return {
      ...base,
      participantIds: rows.map((r) => r.playerId),
      scoresByPlayerId: {},
      teamByPlayerId: Object.fromEntries(rows.map((r) => [r.playerId, r.team])),
      winningTeam: winningRow?.team ?? null,
      cooperativeWon: null,
      pickedPlayerId: null,
    };
  }

  // cooperative / single_winner / single_loser all write to outcome_results
  // with the correct per-player `won` already encoded at write time - so
  // "the winner" for single_winner, "the loser" for single_loser, and
  // "did everyone win" for cooperative are all just different READS of the
  // same won column, not different write shapes.
  const outcomeRows = await db.select().from(outcomeResults).where(eq(outcomeResults.playId, playId));
  if (rules.winCondition === "cooperative") {
    return {
      ...base,
      participantIds: outcomeRows.map((r) => r.playerId),
      scoresByPlayerId: {},
      teamByPlayerId: {},
      winningTeam: null,
      cooperativeWon: outcomeRows.some((r) => r.won),
      pickedPlayerId: null,
    };
  }

  const picked = outcomeRows.find((r) => (rules.winCondition === "single_winner" ? r.won : !r.won));
  return {
    ...base,
    participantIds: outcomeRows.map((r) => r.playerId),
    scoresByPlayerId: {},
    teamByPlayerId: {},
    winningTeam: null,
    cooperativeWon: null,
    pickedPlayerId: picked?.playerId ?? null,
  };
}
```

Read the file first and confirm `plays`, `sessions`, `leaderboardResults`, `teamResults`, `outcomeResults` are already imported from `@/db/schema`, `and`/`eq` are already imported from `drizzle-orm`, and `resolveEffectiveRules`/`EffectiveRules` are already imported from `./rules` — all of these were added by an earlier fix (`getSessionDetails`/`getSessionPlaySummaries`'s cross-tenant scoping) and should already be present. No new imports should be needed for this function. Do NOT add a duplicate `@/db/schema` import line.

- [ ] **Step 4: Run the script again and confirm it passes**

Run: `npm run db:verify-layer`

Expected: prints `results.ts getPlayForEdit OK (leaderboard rehydration, team rehydration, missing play)` followed by `Data-access layer verification passed.`, and no leftover fixture rows afterward.

- [ ] **Step 5: Verify the full build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/results.ts scripts/verify-data-layer.js
git commit -m "feat: add getPlayForEdit for the Edit result screen's rehydration"
```

---

### Task 2: `getPlayersByIds` — fill in historical participants missing from current membership

**Files:**
- Modify: `src/app/lib/db/players.ts`

The Edit result screen's "Who played?" checkbox list needs to include every player who's actually a participant in the play being edited — even if that player has since left the club and no longer shows up in `getAllPlayersInClub`. Without this, editing an old play could silently drop a departed member's score/result on save, since the form only submits data for players it renders.

- [ ] **Step 1: Add the function**

Read `src/app/lib/db/players.ts` first to confirm its current shape. Add this new exported function (near `getPlayerById`, since it's the same kind of simple id-based lookup):

```ts
export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await db.select().from(players).where(inArray(players.id, ids));
  return rows.map(toPlayer);
}
```

This requires adding `inArray` to the existing `import { and, eq } from "drizzle-orm";` line — change it to `import { and, eq, inArray } from "drizzle-orm";`. `players` (the schema table) and `toPlayer` are already imported/defined in this file.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Note on testing**

This is a trivial, direct passthrough over a single indexed lookup with no branching logic — consistent with how this codebase doesn't separately unit-test similarly simple reads like `getPlayerById`. No test coverage needed; its correctness will be evident once Task 6 wires it into the Edit result page.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/players.ts
git commit -m "feat: add getPlayersByIds for edit-result roster rehydration"
```

---

### Task 3: Real Club Stats screen

**Files:**
- Modify: `src/app/clubs/[clubId]/stats/page.tsx`

This fully replaces the Phase 2 placeholder. `getClubStats` (built and tested in Phase 1) already computes everything this screen needs — no new data-layer work.

- [ ] **Step 1: Replace the full contents of `src/app/clubs/[clubId]/stats/page.tsx`**

Read the current file first to confirm it's still the Phase 2 placeholder (membership check + "coming soon" message). Replace it with:

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getClubStats } from "@/app/lib/db/stats";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function ClubStatsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [club, stats] = await Promise.all([getClubDetails(clubId), getClubStats(clubId)]);

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Club stats" eyebrow={club.name} />

      <div className="grid grid-cols-2 border-b-2 border-divider">
        <div className="border-r border-divider px-5 py-4">
          <p className="text-[28px] font-bold text-text">{stats.sessionCount}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">Sessions</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[28px] font-bold text-text">{stats.playCount}</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">Results logged</p>
        </div>
      </div>

      <div className="flex-1">
        {stats.leaderboard.length === 0 ? (
          <EmptyState title="No results logged yet" helper="Stats will appear after the first game." />
        ) : (
          <div>
            <p className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
              Most wins
            </p>
            {stats.leaderboard.map((row, i) => (
              <div key={row.playerId} className="flex items-center gap-3 border-b border-divider px-5 py-3">
                <span className="w-4 text-[13px] text-text opacity-45">{i + 1}</span>
                <InitialSquare label={row.name} size={38} variant="accentTint" />
                <div className="flex-1">
                  <p className="text-[15px] text-text">{row.name}</p>
                  <p className="text-[12px] text-text opacity-55">
                    {row.played} {row.played === 1 ? "game played" : "games played"}
                  </p>
                </div>
                <span className="text-[17px] font-bold text-accent-700">{row.wins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

The membership check was already correct in the Phase 2 placeholder (it was one of the routes built *after* the security lesson landed) — confirm it's unchanged, just carried forward.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

You don't have browser access. Confirm via `npm run build` succeeding that `getClubStats`/`getClubDetails`/`checkIfPlayerIsClubMember` and all `@/app/ui/ds/*` imports resolve. Note in your report that visual confirmation (stat grid numbers, leaderboard rows sorted by wins, empty state for a club with no results yet) requires a real browser and is deferred to the human.

- [ ] **Step 4: Commit**

```bash
git add "src/app/clubs/[clubId]/stats/page.tsx"
git commit -m "feat: replace Club stats placeholder with the real stats screen"
```

---

### Task 4: `ResultForm` shared client component

**Files:**
- Create: `src/app/ui/clubs/ResultForm.tsx`

This is the biggest single piece of this phase: one form covering all 5 win conditions, shared between Add and Edit. Read the "The existing wire format `ResultForm` must produce" section at the top of this plan before implementing — every hidden input this component renders exists to satisfy that exact, unchangeable contract in `results-actions.ts`.

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useState } from "react";
import { recordPlayResults, updatePlayResults } from "@/app/lib/db/results-actions";
import { BoardGame, Player } from "@/app/lib/definitions";
import type { PlayEditData } from "@/app/lib/db/results";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

// BoardGame.winCondition is the UI-coded string ("0".."4") already produced
// by getAllBoardgames via WIN_CONDITION_DB_TO_UI - matching the same codes
// AddGameForm's radio values already use, so no new mapping is invented
// here, just reused.
const WIN_LABELS: Record<string, string> = {
  "0": "Leaderboard",
  "1": "Team based",
  "2": "Co-operative",
  "3": "Single winner",
  "4": "Single loser",
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
  const editTeamLabels = initialData ? [...new Set(Object.values(initialData.teamByPlayerId))].sort() : [];
  const [teamLabels] = useState<[string, string]>(
    editTeamLabels.length === 2 ? (editTeamLabels as [string, string]) : ["A", "B"]
  );
  const [teams, setTeams] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, initialData?.teamByPlayerId[m.id] ?? teamLabels[0]]))
  );
  const [winningTeam, setWinningTeam] = useState(initialData?.winningTeam ?? teamLabels[0]);
  const [coopWon, setCoopWon] = useState(initialData?.cooperativeWon ?? true);
  const [pickedPlayerId, setPickedPlayerId] = useState(initialData?.pickedPlayerId ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const selectedGame = games.find((g) => g.id === gameId);
  const winCode = selectedGame?.winCondition ?? "";
  const selectedMembers = members.filter((m) => checked[m.id]);

  const validationError = (() => {
    if (selectedMembers.length === 0) return "Select at least one player.";
    if (winCode === "0" && selectedMembers.some((m) => scores[m.id].trim() === "" || Number.isNaN(Number(scores[m.id])))) {
      return "Enter a score for every player.";
    }
    if (winCode === "3" && (!pickedPlayerId || !checked[pickedPlayerId])) {
      return "Pick the winner.";
    }
    if (winCode === "4" && (!pickedPlayerId || !checked[pickedPlayerId])) {
      return "Pick the loser.";
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

      {(winCode === "0" || winCode === "1" || winCode === "2") &&
        selectedMembers.map((m) => {
          const csv =
            winCode === "0" ? `true,${scores[m.id] || "0"},` : winCode === "1" ? `true,,${teams[m.id]}` : `true,,`;
          return <input key={m.id} type="hidden" name={`player_${m.id}`} value={csv} />;
        })}
      {(winCode === "3" || winCode === "4") &&
        selectedMembers.map((m) => <input key={m.id} type="hidden" name="participant" value={m.id} />)}

      <label className="text-[14px] font-medium text-text" htmlFor="game">
        Game
      </label>
      <select
        id="game"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      >
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
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

      {winCode === "0" && selectedMembers.length > 0 && (
        <div className="mt-5">
          <p className="text-[14px] font-medium text-text">
            Scores — {selectedGame?.scoringDirection === "Low" ? "lowest" : "highest"} score wins
          </p>
          <div className="mt-2 flex flex-col">
            {selectedMembers.map((m) => (
              <div
                key={m.id}
                className="-mt-px flex items-center justify-between border border-divider px-3 py-2 first:mt-0"
              >
                <span className="text-[14px] text-text">{m.name}</span>
                <input
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

      {winCode === "1" && selectedMembers.length > 0 && (
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
          </div>
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
```

Notes on a few deliberate choices, so you don't "fix" them:
- `name="pickedPlayerRadioGroup"` on the winner/loser radio buttons is never read server-side — the actual submission goes through the separate hidden `winner`/`loser` input above. The shared `name` only exists for correct native radio-group accessibility semantics; it gets submitted too, harmlessly, since `parseCheckedPlayers`/`writeResultRows` only look for field names they recognize.
- `scoringDirection` is deliberately never submitted — see the wire-format note at the top of this plan.
- The team-based toggle's two labels are hardcoded `"A"`/`"B"` for a brand-new result, but for an edit of an existing play, they're derived from whatever two distinct team values that play's `teamResults` rows actually contain (falling back to `"A"`/`"B"` if that data doesn't cleanly resolve to exactly two labels) — this correctly displays and re-submits legacy team names from before this UI existed, rather than silently renaming them.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds. Nothing imports this component yet (that's Tasks 5/6), so this only proves it type-checks in isolation.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/clubs/ResultForm.tsx
git commit -m "feat: add ResultForm component shared by Add and Edit result screens"
```

---

### Task 5: Add result screen

**Files:**
- Create: `src/app/clubs/[clubId]/sessions/[sessionId]/results/new/page.tsx`

**Membership check from the start**, same as every `[clubId]`-scoped route since the lesson was learned (twice) in earlier phases.

- [ ] **Step 1: Create the page**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import ResultForm from "@/app/ui/clubs/ResultForm";

export default async function AddResultPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [members, games] = await Promise.all([getAllPlayersInClub(clubId), getAllBoardgames(clubId)]);
  if (games.length === 0) {
    redirect(`/clubs/${clubId}/sessions/${sessionId}`);
  }

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}/sessions/${sessionId}`} title="Add result" />
      <ResultForm
        mode="add"
        sessionId={sessionId}
        clubId={clubId}
        games={games}
        members={members}
        initialData={null}
      />
    </AppShell>
  );
}
```

The `games.length === 0` redirect is defensive: Session Detail only ever shows the "Add result" link when `games.length > 0`, but this route is directly navigable regardless of which screen links to it (the same reasoning behind every membership check added this phase), so a club with zero games shouldn't be able to reach a form with an empty, broken game select.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

You don't have browser access. Confirm via `npm run build` succeeding that all imports resolve. Note in your report that full interactive confirmation (submitting a result for each win condition and confirming it appears correctly on Session Detail) requires a real browser and is deferred to the human.

- [ ] **Step 4: Commit**

```bash
git add "src/app/clubs/[clubId]/sessions/[sessionId]/results/new/page.tsx"
git commit -m "feat: add Add result screen"
```

---

### Task 6: Edit result screen

**Files:**
- Create: `src/app/clubs/[clubId]/sessions/[sessionId]/results/[playId]/edit/page.tsx`

**Membership check from the start**, same as Task 5.

- [ ] **Step 1: Create the page**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkIfPlayerIsClubMember, getPlayersByIds } from "@/app/lib/db/players";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getPlayForEdit } from "@/app/lib/db/results";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import ResultForm from "@/app/ui/clubs/ResultForm";

export default async function EditResultPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string; playId: string }>;
}) {
  const { clubId, sessionId, playId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [currentMembers, games, editData] = await Promise.all([
    getAllPlayersInClub(clubId),
    getAllBoardgames(clubId),
    getPlayForEdit(clubId, playId),
  ]);
  if (!editData) {
    redirect(`/clubs/${clubId}/sessions/${sessionId}`);
  }

  const missingIds = editData.participantIds.filter((id) => !currentMembers.some((m) => m.id === id));
  const historicalMembers = await getPlayersByIds(missingIds);
  const members = [...currentMembers, ...historicalMembers];

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}/sessions/${sessionId}`} title="Edit result" />
      <ResultForm
        mode="edit"
        sessionId={sessionId}
        clubId={clubId}
        playId={playId}
        games={games}
        members={members}
        initialData={editData}
      />
    </AppShell>
  );
}
```

`getPlayForEdit(clubId, playId)` returning `null` doubles as both "play doesn't exist" and "this play belongs to a different club" — Task 1's implementation scopes its lookup by joining `plays` to `sessions` and checking `sessions.clubId = clubId`, mirroring the same cross-tenant fix already applied to `getSessionDetails`/`getSessionPlaySummaries`. Confirm this is genuinely true by reading `getPlayForEdit`'s actual current implementation before wiring it into this page — if you find it's NOT scoped that way (e.g. Task 1 wasn't implemented as written, or was later changed), STOP and treat that as a blocker for this task rather than shipping an edit form that can leak or corrupt another club's play data.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

You don't have browser access. Confirm via `npm run build` succeeding that all imports resolve, including `getPlayersByIds` from Task 2. Note in your report that full interactive confirmation (opening Edit on an existing result and confirming every field prefills correctly for each win condition) requires a real browser and is deferred to the human.

- [ ] **Step 4: Commit**

```bash
git add "src/app/clubs/[clubId]/sessions/[sessionId]/results/[playId]/edit/page.tsx"
git commit -m "feat: add Edit result screen"
```

---

### Task 7: Point Session Detail at the new Add/Edit result screens

**Files:**
- Modify: `src/app/clubs/[clubId]/sessions/[sessionId]/page.tsx`

Read the current file first to confirm it matches what's shown below (it should — this is the exact state Phase 3 left it in).

- [ ] **Step 1: Add imports**

Change:

```tsx
import { Trophy } from "lucide-react";
```

to:

```tsx
import Link from "next/link";
import { Trophy, Pencil } from "lucide-react";
```

- [ ] **Step 2: Swap the "Add result" bridge link**

Find:

```tsx
              <LinkButton href={`/add/result?sessionId=${sessionId}&clubId=${clubId}`} variant="primary" compact>
                Add result
              </LinkButton>
```

Change to:

```tsx
              <LinkButton href={`/clubs/${clubId}/sessions/${sessionId}/results/new`} variant="primary" compact>
                Add result
              </LinkButton>
```

- [ ] **Step 3: Add the Edit button to each play row**

Find the play row's closing structure:

```tsx
                  {play.notes && (
                    <p className="mt-2 border-l-2 border-accent bg-accent-100 px-2 py-1 text-[12.5px] text-text">
                      {play.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
```

Change to:

```tsx
                  {play.notes && (
                    <p className="mt-2 border-l-2 border-accent bg-accent-100 px-2 py-1 text-[12.5px] text-text">
                      {play.notes}
                    </p>
                  )}
                </div>
                <Link
                  href={`/clubs/${clubId}/sessions/${sessionId}/results/${play.playId}/edit`}
                  aria-label={`Edit ${play.gameName} result`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-text opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <Pencil size={16} strokeWidth={2} />
                </Link>
              </div>
            ))}
```

(The `Link` sits as a sibling of the existing `flex-1` content div, both inside the outer `<div key={play.playId} className="flex gap-3 ...">` row — don't nest it inside the content div.)

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 5: Grep for any remaining reference to the old bridge**

Run: `grep -rn "/add/result" src/app --include=*.tsx --include=*.ts`

Expected: no matches remain anywhere in `src/app` except inside `src/app/add/result/` itself (its own route files) — that directory still exists and still builds until Task 8 deletes it, but nothing should still *link* to it after this task.

- [ ] **Step 6: Commit**

```bash
git add "src/app/clubs/[clubId]/sessions/[sessionId]/page.tsx"
git commit -m "feat: point Session detail's Add/Edit result links at the new screens"
```

---

### Task 8: Delete the retired `/add/result` route and its dependencies

**Files:** deletion only, grep-verify first.

Every file below is a candidate because it existed only to support the old `/add/result` page, now fully superseded by Tasks 4-6. Follow the same discipline as every prior phase's cleanup task: verify before deleting, don't assume.

- [ ] **Step 1: Grep-verify each deletion candidate has no remaining importer**

```bash
grep -rn "add/Results/addGameResult\|add/Results/leaderboardradio\|add/Results/teambasedradio\|add/Results/cooperativeradio\|winConditions/results\|winConditions/leaderboard\|winConditions/playerRow\|winConditions/teambased\|winConditions/teamRow" src/app --include=*.tsx --include=*.ts
```

Every hit should be either (a) inside one of these same candidate files (they import each other) or (b) inside `src/app/add/result/page.tsx` itself. If anything OUTSIDE this file set imports one of these, STOP and report it — don't delete that file, and reconsider whether the others are still safe to remove.

- [ ] **Step 2: Delete the route and its component tree**

```bash
git rm -r src/app/add/result/
git rm -r src/app/ui/add/Results/
git rm -r src/app/ui/winConditions/
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`

Expected: succeeds, and `/add/result` no longer appears in the build output's route table. If it fails on a missing-module error, that means Step 1's grep missed an importer — restore the specific file with `git checkout -- <path>` and investigate before re-attempting, rather than deleting more to make the error go away.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete the retired /add/result route and its old win-condition components"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run every check this repo has**

```bash
npm run lint
npm run build
npm run db:verify
npm run db:verify-layer
```

Expected: all four succeed.

- [ ] **Step 2: Full manual click-through**

From a session with at least one game: click "Add result" → confirm the form loads with the right game preselected, checkboxes all pre-checked → switch through a few different games in the select and confirm the condition-specific block changes correctly for each win condition (leaderboard scores, team A/B toggle + winning-team segmented control, cooperative segmented control, single winner/loser radio rows) → submit a leaderboard result and confirm it appears on Session Detail with the correct summary/detail text → click the pencil Edit button on that result → confirm every field prefills correctly (scores, notes) → change something and save → confirm the change is reflected → repeat spot-checks for at least team_based and single_winner/single_loser → visit Club Stats and confirm the session/results counts and the wins leaderboard reflect the results just recorded.

- [ ] **Step 3: Final review**

Confirm via `git log --oneline` that all of Task 1 through Task 8's commits are present, and via `git status` that the working tree is clean (aside from the pre-existing unrelated `yarn.lock`/scratch files noted in every prior phase).

---

## What comes after this

This is the last planned phase of the mobile redesign. Two known, deliberate gaps remain, both flagged since Phase 2 and not addressed by this plan:
- **`/join/club`** (browse-and-request-to-join) has no designed replacement anywhere in the 12-screen handoff — left untouched and reachable, a real product gap rather than an oversight.
- **`/add/player`** and **`ui/add/addNewPlayer.tsx`** (manual player creation disconnected from Clerk identity) were never part of the redesign scope and remain untouched, dev/test scaffolding.

