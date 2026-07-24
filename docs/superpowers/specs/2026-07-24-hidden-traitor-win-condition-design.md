# Hidden traitor win condition

## Context

TunnelSnakesRule's `games`/`club_game_variants` tables carry a `win_condition` enum that determines how a play's results are recorded and read: `leaderboard`, `team_based`, `cooperative`, `single_winner`, `single_loser` (see `docs/superpowers/specs/2026-07-22-database-schema-redesign-design.md`, since implemented in `src/db/schema.ts`). None of the five fit games like *Betrayal at the House on the Hill*, where most players start cooperative but one or more may secretly turn traitor partway through — the game can end with a specific side (heroes), an individual (the traitor), or nobody (the haunt/house) winning.

Structurally, `team_based` already stores almost what's needed: `team_results` is `(playId, playerId, team: text, won: boolean)`, with ad-hoc team labels and win attribution computed purely from the `won` column. A team of one player, or a "nobody won" state (today's `team_based` UI represents this as "Tie" — every row `won: false`), are already representable. What's missing is presentational, not structural: `team_based`'s UI hardcodes generic "Team A"/"Team B" labels and calls the no-winner case "Tie", which doesn't fit a game framed around specific asymmetric roles (heroes vs. traitor) and a distinct "the house wins" outcome rather than a sports-style tie.

This spec adds a sixth win condition, `hidden_traitor`, that reuses `team_results` for storage but gives clubs a way to name the two roles and the "nobody wins" outcome when they add the game, and shows those names throughout scoring and summaries instead of generic team/tie language.

## Goals

- Let a club add a game where the outcome is: one of two named roles wins, or neither does (a third, distinct, per-game-labeled outcome — not a tie).
- Reuse `team_results` for storage; no new result table, no change to the `team_based` write path or its "Team A"/"Team B"/"Tie" UI.
- Role and "neither" labels are free text set once per game (or per club variant), not re-entered at scoring time.
- Every existing read path that already treats `team_based`/`team_results` generically (`stats.ts`'s win tally, `getPlayForEdit`'s team-shape branch) keeps working for `hidden_traitor` without new branches, since the data shape is identical.

## Non-goals

- No restriction on how many players can be in either role (e.g. exactly one traitor) — same unrestricted-group-size behavior as `team_based`.
- No change to `team_based` itself — it keeps its existing generic labels and "Tie" wording.
- No app-wide default role/neither-label copy — every game using `hidden_traitor` must supply its own three labels at add time.

## Schema

```
win_condition enum gains: 'hidden_traitor'

games / club_game_variants gain:
  role_one_label   text, nullable   -- required iff win_condition = 'hidden_traitor', e.g. "Heroes"
  role_two_label   text, nullable   -- required iff win_condition = 'hidden_traitor', e.g. "Traitor"
  neither_label    text, nullable   -- required iff win_condition = 'hidden_traitor', e.g. "The house wins"
```

New `CHECK` constraint on both tables (alongside the existing `scoring_direction` one):

```sql
(win_condition = 'hidden_traitor'
  AND role_one_label IS NOT NULL
  AND role_two_label IS NOT NULL
  AND neither_label IS NOT NULL)
OR
(win_condition <> 'hidden_traitor'
  AND role_one_label IS NULL
  AND role_two_label IS NULL
  AND neither_label IS NULL)
```

`hidden_traitor` plays are recorded in `team_results` — same `(play_id, player_id, team, won)` shape `team_based` already uses. `team` stores the actual configured label text (e.g. `"Traitor"`), not a generic code.

## Effective rules resolution

`EffectiveRules` (`src/app/lib/db/rules.ts`) gains `roleOneLabel`, `roleTwoLabel`, `neitherLabel: string | null`, resolved through the same `club_game_variants ?? games` lookup `resolveEffectiveRules` already does for `winCondition`/`scoringDirection`. This is the one shared path, so every read site (scoring form, summaries, edit screen) sees club-variant-aware labels without separate lookups.

## Write path

`writeResultRows` (`src/app/lib/db/results-actions.ts`) gets a new switch case, structurally identical to `team_based`'s:

```ts
case "hidden_traitor": {
  const winningRole = formData.get("winner")?.toString();
  for (const entry of checkedPlayers) {
    await db.insert(teamResults).values({
      playId,
      playerId: entry.playerId,
      team: entry.team,
      won: winningRole !== NO_WINNER_SENTINEL && entry.team === winningRole,
    });
  }
  break;
}
```

`NO_WINNER_SENTINEL` is a fixed internal constant (not the literal text of `neitherLabel`), so the "nobody won" state round-trips correctly even if a club's free-typed `neitherLabel` happens to collide with something else. `team_based`'s existing `"Tie"` literal is untouched — the two cases don't share a sentinel.

`updatePlayResults`'s existing delete-from-all-three-then-rewrite requires no change, since `hidden_traitor` writes to `team_results` like `team_based` does.

## Read path

- **`stats.ts` (`getClubStats`)** — no change. Its team branch already computes wins via `teamRows.filter(r => r.won)`, independent of which win condition produced those rows.
- **`getPlayForEdit`** (`results.ts`) — its `team_based` branch (`teamByPlayerId`, `winningTeam`) is extended to also match `hidden_traitor`: `rules.winCondition === "team_based" || rules.winCondition === "hidden_traitor"`. No new shape needed — the stored `team` value is already the real label text.
- **`getSessionPlaySummaries`** (`results.ts`) — its team branch currently hardcodes `"Team ${label} won"` / `"Tied"`. Branches on `rules.winCondition === "hidden_traitor"` to instead render `"${roleLabel} won"` (no "Team" prefix) and substitute the resolved `neitherLabel` for the no-winner case.
- **`getEventWinner`** (`results.ts`) — same fix: returns the resolved `neitherLabel` instead of a hardcoded `"Tied"` string when `hidden_traitor` produced no winner.

## UI

**`AddGameForm.tsx`** — new radio option, `"Hidden traitor" — "One or more players may secretly work against the rest."` (UI code `"5"`, alongside the existing `"0"`–`"4"`). Selecting it swaps out the leaderboard scoring-direction toggle for three text inputs: role one label, role two label, "nobody wins" label. `canSubmit` requires all three non-empty and pairwise distinct.

**`games-actions.ts` / `games.ts`** — `WIN_CONDITION_UI_TO_DB`/`WIN_CONDITION_DB_TO_UI` gain a `"5" ↔ "hidden_traitor"` entry. `addNewBoardGame` parses and writes the three label fields through the same new-game-vs-club-variant branch that already exists for `winCondition`/`scoringDirection`. `BoardGame` (`definitions.ts`) and `getAllBoardgames`/`getBoardgameById` expose the three resolved labels.

**`ResultForm.tsx`** — `winCode === "5"` renders the same per-player group-toggle layout `winCode === "1"` (team_based) already uses, but the two toggle buttons read the game's actual `roleOneLabel`/`roleTwoLabel` instead of hardcoded "Team A"/"Team B". The winner picker offers three buttons — role one, role two, and the game's `neitherLabel` — where the third submits `NO_WINNER_SENTINEL` as a hidden input value rather than the literal label text.

## Invariants

**Enforceable as a database `CHECK` constraint:**
- On both `games` and `club_game_variants`: `role_one_label`, `role_two_label`, `neither_label` are all set if and only if `win_condition = 'hidden_traitor'` (mirrors the existing `scoring_direction` constraint).

**Not enforceable in the schema — must live in one shared code path:**
- `role_one_label`/`role_two_label`/`neither_label` must be pairwise distinct — checked in `AddGameForm`'s submit validation (client) and should also be validated in `addNewBoardGame` (server), same defense-in-depth level as other form invariants in this codebase.
- The "no winner" sentinel used in `ResultForm`'s hidden `winner` input and compared in `writeResultRows` must be the same constant in both places — one shared exported constant, not a duplicated string literal.

## Decisions considered and rejected

- **A new result table** (e.g. `hidden_traitor_results`) was considered, mirroring the three-table split in the original schema redesign. Rejected — the data shape needed (team label + won boolean) is identical to `team_results`, and splitting it out would just duplicate `team_based`'s read/write logic for no correctness benefit.
- **Extending `team_based` itself** with optional custom labels, rather than adding a new enum value, was considered. Rejected per explicit product decision: this should appear as its own distinct choice in "Add game" with its own copy, not a variant of team_based's setup flow.
- **Restricting role two to exactly one player** (the classic single-traitor mechanic) was considered. Rejected as unnecessary validation — `team_based` imposes no group-size restriction today, and some hidden-traitor games/expansions do allow more than one traitor.
- **A fixed, app-wide "The game won" label** for the no-winner case (reusing `cooperative`'s existing phrasing) was considered instead of a per-game field. Rejected — the product decision was that this wording should be as configurable as the two role labels, since "the house wins" reads differently across different games' theming.

## Open items for the implementation plan

- Drizzle schema changes (enum value, three columns × two tables, new check constraints) and the corresponding migration.
- `NO_WINNER_SENTINEL` as one shared exported constant, imported by both `ResultForm.tsx` and `results-actions.ts`.
- Server-side distinctness validation for the three labels in `addNewBoardGame`, alongside the existing client-side check.
- Manual verification pass (per this project's Next.js build-verification habit): `npm run build` and exercising add-game → record result → edit result → session summary → club stats end-to-end for a `hidden_traitor` game, not just `tsc`/`eslint`.
