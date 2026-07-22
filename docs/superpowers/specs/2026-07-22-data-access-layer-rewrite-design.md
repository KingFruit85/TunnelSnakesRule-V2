# Data access layer rewrite (Phase 2)

## Context

Phase 1 (see `docs/superpowers/specs/2026-07-22-database-schema-redesign-design.md` and its implementation plan) replaced the app's Postgres schema with the normalized 11-table Drizzle schema, and applied that migration to the live database. As a direct result, `src/app/lib/data.ts` and `src/app/lib/actions.ts` no longer work — they query tables (`boardgames`, `playerscores`, `gameresults`, `players_clubs`, `joinrequests`) that were dropped, and the old `sessions`/`clubs`/`players` shapes they assume no longer exist either. The app will not build/run correctly until this rewrite is done.

Per the earlier decision, this is a **functional port**: same screens, same navigation, same visual style. UI only changes where the new schema genuinely requires it. Digging through the current components (`Leaderboard.tsx`, `PlayerRow.tsx`, `TeambasedRadio`, `CooperativeRadio`) while planning this rewrite surfaced several real gaps between what the current UI does and what the new schema's invariants require — these are documented below as resolved decisions, not open questions.

## Goals

- Rewrite every function in `data.ts`/`actions.ts` against the 11-table schema, using the Drizzle client from `src/db/client.ts`.
- Preserve every existing screen and flow, changing only what the new schema forces.
- Split the data-access layer by domain while rewriting it, since `data.ts` was already ~480 lines before this rewrite adds win-condition resolution and three-way result writes.
- Close two gaps in the current app that the new schema's invariants expose: single-winner/single-loser games recording no participants beyond the winner/loser, and team ties having no valid representation in a non-nullable `won` column.

## Non-goals

- No UX redesign — screens that work today keep their layout, copy, and visual style. (A later, separate pass can revisit UX; not this one.)
- No new automated test framework — this repo has none today, and introducing one is out of scope for this rewrite specifically.
- No changes to Clerk auth, the recent Next 15 upgrade, or anything unrelated to the data-access layer.

## Architecture

Replace the two flat files with a per-domain module set under `src/app/lib/db/`, each owning both reads and writes for its domain (the current split of "all reads in `data.ts`, all writes in `actions.ts`" is dropped in favor of grouping by what the code is *about*):

```
src/app/lib/db/
  players.ts    - player CRUD, club membership (club_members, join_requests)
  clubs.ts      - club CRUD, ownership
  games.ts      - games catalog + club_game_variants
  rules.ts      - resolveEffectiveRules(clubId, gameId): the one shared
                  club_game_variants ?? games lookup the spec's invariants
                  require living in exactly one place
  sessions.ts   - sessions, plays, and the two distinct "roster" queries
  results.ts    - recordPlayResults() and the three-way result read/write
```

Server Actions currently in `actions.ts` move into whichever domain file they belong to (e.g. `addNewGameResult` → `results.ts`, `addNewClub` → `clubs.ts`), each still marked `"use server"` at the function level as Next.js requires. Files that only read stay marked `import "server-only"` (matching the recent security fix that moved `data.ts` off `"use server"` since reads shouldn't be callable as RPCs).

## Write path: recording a play's result

One Server Action per submission, same as today's `addNewGameResult` — the UI still submits one form per result. Internally:

1. `resolveEffectiveRules(clubId, gameId)` — checks `club_game_variants` for that exact `(club_id, game_id)` pair; falls back to `games` if no variant row exists. Returns the effective `winCondition` and `scoringDirection`. This is the *only* place in the codebase that performs this lookup, per the schema spec's invariant.
2. Insert one `plays` row (`session_id`, `game_id`, `notes`).
3. Branch on the resolved `winCondition` into exactly one of:
   - **leaderboard** → insert `leaderboard_results` rows: one per checked player, with their entered `score`.
   - **team_based** → insert `team_results` rows: one per checked player, with their selected `team` and a `won` boolean. `won` is `true` only for rows whose team matches the selected winning team; if "Tie" was selected, every row gets `won = false` (no schema change — a tie is represented as "no team has `won = true` for this play," a display-layer convention, not a stored value).
   - **cooperative** → insert `outcome_results` rows: one per checked player, `won` = `true` for every row if "Players" was selected, `false` for every row if "Game" was selected.
   - **single_winner** / **single_loser** → insert `outcome_results` rows: one per *checked participant* (not just the selected winner/loser — this is the gap this rewrite closes), `won = true` for the selected player and `false` for the rest (single_winner), or the inverse (single_loser).
4. `revalidatePath` + `redirect`, matching the existing pattern.

This is one function (`recordPlayResults` in `results.ts`) with the branch inside it — not four separate Server Actions — so there's exactly one write path per the spec's invariant, not four that could each get the resolution logic slightly wrong.

## Read path

Two different things both informally called "the roster" today become explicitly distinct:

- **Record-time roster** (the checklist shown when starting to record a new play's results): always every `club_members` row for that club, regardless of what's been recorded earlier in the session. Settled during brainstorming — simplest rule, matches the spec's roster invariant exactly.
- **Historical roster** (who played a session that's already underway or finished): derived — the distinct set of `player_id`s across all three result tables, joined through that session's `plays`. This is what session summary/history views use; it does not use `club_members` at all.

Both single_winner/single_loser's *participant* checkboxes and leaderboard/team-based/cooperative's existing checkbox row pull from the record-time roster (`club_members`), so every win condition now has a consistent "who's actually playing this specific play" step before the type-specific inputs.

The board-game picker (`games.ts`) gains a per-club query that returns each game alongside whether a `club_game_variants` row exists for that club — this drives the `*` marker in the dropdown and the "X club's house rules" subtext, both confirmed via mockup during brainstorming.

## UI changes

All of these are consequences of the schema, not redesign:

- **House rules indicator**: dropdown options for games with a club variant get a trailing `*`; selecting one reveals a subtext line below the dropdown ("{club name}'s house rules"), hidden for games without a variant.
- **Single-winner/single-loser participants**: a checkbox row (same visual treatment as `PlayerRow`'s existing checkboxes) is added above the avatar-grid winner/loser picker. Unchecking a player removes them from the avatar grid. Previously this screen had no participant tracking at all.
- **Score input removed for team-based and cooperative**: `PlayerRow` currently renders a numeric score input unconditionally; `team_results` and `outcome_results` have no `score` column, so the input is dropped for those two win conditions (leaderboard keeps it — it's the only table with a `score` column).
- **Team tie**: `TeambasedRadio`'s existing "Tie" option is kept as-is in the UI; only the write path changes (all `team_results` rows for that play get `won = false` instead of the old string `"Tie"` being stored as a winner value).

## Error handling

No new pattern. The recent security-fix commit already added `error.tsx` boundaries at the root, `/sessions`, and `/players` routes; this rewrite extends those same boundaries to cover the new query/mutation functions rather than introducing a different error-handling approach.

## Verification

This repo has no automated test framework, and introducing one is out of scope here (per Non-goals). Verification is two-layered, extending the precedent Phase 1 set with `scripts/verify-schema.js`:

- A script that round-trips the new `results.ts`/`sessions.ts` functions directly — calling the actual exported TypeScript functions (not raw SQL) to catch regressions in the resolution/branching logic, structured the same way as Phase 1's script (insert inside a transaction, always roll back).
- Manual verification in a browser: since this phase touches real UI (not just the data layer), the implementation plan must include running the dev server and walking through record-a-result (for at least one game of each win condition) and view-a-session before the work is considered done — matching this project's standing requirement that UI changes be exercised in a browser, not just type-checked.

## Decisions considered and rejected

- **Keeping `data.ts`/`actions.ts` as the two-file split** was considered (least restructuring). Rejected — `data.ts` was already large and awkward before this rewrite adds win-condition resolution and three-way result handling on top; splitting by domain now (while every function is being touched anyway) costs less than doing it later.
- **A nullable `team_results.won` column to represent ties explicitly** was considered. Rejected in favor of "no `won = true` row for this play" as the tie signal — avoids a schema change, and the display layer already has to query "which team won" per play regardless.
- **Leaving single-winner/single-loser without participant tracking** (i.e., matching today's behavior exactly) was considered. Rejected — the spec's session-roster invariant depends on every result table having rows for every participant; a session where only single-winner/single-loser games were played would otherwise have a badly incomplete derived roster (only the winner/loser, not everyone who played).

## Open items for the implementation plan

- Exact Drizzle query code for each function in `players.ts`/`clubs.ts`/`games.ts`/`rules.ts`/`sessions.ts`/`results.ts`, replacing the raw SQL in the current `data.ts`/`actions.ts`.
- The verification script exercising the new TypeScript functions (structure mirrors `scripts/verify-schema.js`, but calls real app code rather than raw SQL).
- Updating `src/app/lib/definitions.ts` types to match the new schema's shapes (e.g. `WinCondition` becomes the five string values from the schema rather than the current numeric TS enum).
- Component-level changes: `PlayerRow.tsx` (drop score input for non-leaderboard), `Leaderboard.tsx`/results picker (house-rules asterisk + subtext, single-winner/single-loser participant checkboxes), `TeambasedRadio`/`CooperativeRadio` (no structural change, just what their values map to on write).
- `scripts/seed.js` rewrite or removal (flagged in Phase 1's spec as stale; this rewrite is the natural point to address it, since it seeds `players` against a shape that no longer exists).
