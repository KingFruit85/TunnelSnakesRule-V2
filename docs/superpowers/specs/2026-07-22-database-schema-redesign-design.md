# Database schema redesign

## Context

TunnelSnakesRule tracks board game club nights: clubs, their members, the games they own, the sessions they run, and the results of each game played. The app was originally built without much prior dev experience and has no formal schema — every table shape lives only as an inference from raw `@vercel/postgres` queries scattered across `src/app/lib/data.ts` and `src/app/lib/actions.ts`. There are no migrations and no ORM.

The current schema has several problems, discovered while reverse-engineering it into an ER diagram:

- `sessions.player_ids` is a comma-joined string column with no referential integrity.
- `gameresults` and `playerscores` are linked only by a shared `event_id` UUID, not a real foreign key relationship.
- `boardgames.win_condition` determines how `playerscores.result` should be interpreted (a numeric score, a team name, or a win/loss flag), meaning one column means different things depending on a sibling row's value.
- `players` carries a legacy `email` column from before Clerk was added for auth. It's still written today (with placeholder junk like `name@test.com` from the manual "add player" flow) but never read for authentication — Clerk's `external_id` is the only identity that matters. (`password` has already been removed from production via `scripts/migrations/001_drop_password.sql`; `avatar` was relaxed to nullable in the same migration, since a player created from a Clerk sign-in has no avatar until they upload one.)
- Player identity is keyed inconsistently across tables: `clubs.owner`, `players_clubs.player_id`, and `joinrequests.player_id` all store the Clerk **external** id, while `sessions.player_ids` and `playerscores.player_id` store the **internal** `players.id`. Nothing in the code enforces which one a given table is supposed to use — it's tracked correctly today only because each call site happens to pass the right one.
- `scripts/seed.js` creates tables that no longer match what the app actually queries.

This spec covers a from-scratch schema redesign, to be implemented with Drizzle (the user has prior experience with it from other projects). **The UI is not a constraint on this redesign** — where the new schema doesn't fit the existing forms/components, the UI will be changed to fit the new schema, not the other way around. UI/implementation changes are out of scope for this document and will be covered by the implementation plan.

## Goals

- Give every table a single, unambiguous shape — no column whose meaning depends on a sibling column or another table's state.
- Make participation and outcomes queryable through real foreign keys, not string-splitting or shared UUIDs-by-convention.
- Let board game rules (win condition, scoring direction) live with the game, while still letting an individual club override those rules for its own house rules.
- Standardize every player-referencing foreign key on the same identity (the internal `players.id`), fixing the current mix of internal/external ids across `clubs`, `players_clubs`, and `joinrequests`.
- Drop dead weight (legacy auth columns, the stale seed script's shape).

## Non-goals

- Data migration from the current production database is not addressed here — this spec defines the target shape only.
- UI/component changes are not specified here.
- Multi-admin club roles, persistent cross-session teams, and a curated/moderated game catalog were considered and explicitly deferred (see "Decisions considered and rejected" below).

## Schema

```
players
  id            uuid pk
  external_id   text, unique, not null      -- Clerk user id; sole identity, no local auth
  name          text, not null
  avatar        text, nullable              -- null until the player uploads one; set later

clubs
  id            uuid pk
  name          text, not null
  owner_id      uuid fk -> players          -- always the internal id, resolved from the Clerk session server-side
  created_at    timestamp

club_members                                -- approved membership (many-to-many)
  player_id     uuid fk -> players           -- internal id, not the raw external_id
  club_id       uuid fk -> clubs
  joined_at     timestamp
  pk (player_id, club_id)

join_requests                               -- pending requests to join a club
  id            uuid pk
  player_id     uuid fk -> players           -- internal id, not the raw external_id
  club_id       uuid fk -> clubs
  requested_at  timestamp

games                                       -- app-wide catalog; one row per game
  id                 uuid pk
  name               text, not null
  win_condition      enum('leaderboard','team_based','cooperative','single_winner','single_loser')
  scoring_direction  enum('high','low'), nullable   -- required iff win_condition = 'leaderboard'

club_game_variants                          -- optional per-club override of a game's rules
  club_id            uuid fk -> clubs
  game_id            uuid fk -> games
  win_condition      enum(...same as games.win_condition...)
  scoring_direction  enum('high','low'), nullable   -- required iff win_condition = 'leaderboard'
  pk (club_id, game_id)

sessions
  id            uuid pk
  club_id       uuid fk -> clubs
  name          text
  date          timestamp
  active        boolean
  notes         text, nullable
  image_urls    jsonb, nullable

plays                                       -- one row per "a game was played, once, in this session"
  id             uuid pk
  session_id     uuid fk -> sessions
  game_id        uuid fk -> games            -- always the base game, never a variant
  notes          text, nullable

leaderboard_results                         -- rows exist only when the play's effective win_condition = 'leaderboard'
  play_id       uuid fk -> plays
  player_id     uuid fk -> players
  score         integer, not null
  pk (play_id, player_id)

team_results                                -- rows exist only when the play's effective win_condition = 'team_based'
  play_id       uuid fk -> plays
  player_id     uuid fk -> players
  team          text, not null              -- ad-hoc label, scoped to this one play only
  won           boolean, not null
  pk (play_id, player_id)

outcome_results                             -- rows exist only when the play's effective win_condition is
  play_id       uuid fk -> plays            -- 'cooperative', 'single_winner', or 'single_loser'
  player_id     uuid fk -> players
  won           boolean, not null
  pk (play_id, player_id)
```

11 tables total.

## Relationships

```
clubs ──owner_id──> players
clubs ──< club_members >── players        (approved membership)
clubs ──< join_requests >── players        (pending requests)

games ──< club_game_variants >── clubs     (per-club house rules, optional)

clubs ──< sessions
sessions ──< plays >── games               (one play = one game, once, in one session)

plays ──< leaderboard_results >── players  ┐
plays ──< team_results        >── players  ├─ exactly one of these three per play
plays ──< outcome_results     >── players  ┘
```

To score a `play`, the effective rule set is resolved as `club_game_variants(session.club_id, play.game_id) ?? games(play.game_id)`, and results are written into whichever of the three result tables that resolved `win_condition` implies.

There is no session-level roster table. "Who played session X" is derived: the distinct set of `player_id`s across all three result tables, joined through `plays.session_id = X`. This is a deliberate choice (a fixed session-start roster doesn't hold up against players leaving mid-session), with one consequence worth naming: a brand-new session with zero recorded plays has no derivable roster yet. The first scoring form for a session must source its player list from `club_members`, not from session history.

## Invariants

Some things Postgres can guarantee directly; others have to be centralized in application code because they span multiple tables.

**Enforceable as a database `CHECK` constraint:**
- On both `games` and `club_game_variants`: `scoring_direction IS NOT NULL` if and only if `win_condition = 'leaderboard'`.

**Not enforceable in the schema — must live in one shared code path each:**
- Exactly one of `leaderboard_results` / `team_results` / `outcome_results` has rows for a given `play_id`, matching that play's resolved `win_condition`. Postgres cannot check this across three tables without triggers, which is more machinery than this app needs. There must be exactly one write path (e.g. a single `recordPlayResults(playId, ...)` function) that resolves the win condition once and only writes to the matching table.
- Resolving `club_game_variants ?? games` must happen identically everywhere rules are read (scoring forms, history views, stats) — one shared lookup function, not duplicated per call site.
- Creating a club must insert both the `clubs.owner_id` row and a matching `club_members` row in the same transaction. An owner who is not also a member is an invalid state that the schema cannot prevent on its own.
- Every write to `clubs.owner_id`, `club_members`, or `join_requests` must resolve Clerk's external id to the internal `players.id` first. Postgres has no way to know which kind of id a `uuid` column was handed, so this can only be caught by routing every such write through one shared "look up (or create) the player row for this Clerk session" helper — never passing `auth().userId` straight into a query.

## Decisions considered and rejected

- **Single polymorphic `results` table** (one table, nullable `score`/`team`/`won` columns) was considered instead of the three-table split above. Rejected in favor of correctness enforced by the schema itself: a cooperative game's result row cannot physically hold a stray `score`, because the table it lives in has no such column.
- **Persistent `teams` entity** (teams that carry an id/name/membership across sessions) was considered for team-based games. Rejected — teams in this app are ad-hoc per play (`team_results.team` is just a label like "Red"), and there's no current need to track a team's record across sessions.
- **Multi-admin club roles** (a `role` column on membership instead of a single `owner_id`) was considered. Rejected as speculative — there's no current need for shared/transferable club ownership.
- **Curated, app-moderated game catalog** was considered (an admin-managed `games` list clubs search rather than freely add to). Rejected for now — `games` is a shared, app-wide table, but any club can add a new row to it; nothing about the schema prevents building curation/moderation on top of it later.
- **Legacy `players.email` column** is dropped entirely (as is `password`, already removed from production ahead of this rewrite). Clerk (`external_id`) is the only auth path; `email` is written with placeholder values by one form today but never read back for anything.

## Open items for the implementation plan

- Drizzle schema definitions and migration setup. `scripts/migrate.js` (a bespoke raw-SQL runner, added alongside the `password`-column drop) can be retired once Drizzle's own migration tooling is in place.
- Rewriting every query in `src/app/lib/data.ts` and `src/app/lib/actions.ts` against the new shape.
- Routing every membership/ownership write through one shared helper that resolves Clerk's external id to the internal `players.id`, closing the internal/external id inconsistency described above.
- UI changes implied by the new shape (e.g. no upfront session roster to seed a player checklist from; a visible "club's house rules" indicator when a `club_game_variants` row exists for the game being scored).
- `scripts/seed.js` is stale relative to both the old and new schema and should be rewritten or removed.

## Amendment — 2026-07-22

Re-checked this spec after pulling in `443ce9c`..`1711239` (Next 15/React 19/Clerk v6 upgrade, a security fix moving club ownership/join-request identity to server-side `auth()`, and a `data.ts` refactor). No table shapes in the *current* schema changed as a result, but the closer read surfaced two things folded into the sections above:

- `password` is now confirmed dropped from production (via a real migration); `email` remains, still written with junk placeholder data, confirming the plan to drop it rather than carry it forward.
- The security fix exposed that `clubs.owner`, `players_clubs.player_id`, and `joinrequests.player_id` store the Clerk external id, while `sessions.player_ids`/`playerscores.player_id` store the internal `players.id` — a real inconsistency the original draft of this spec didn't account for. The schema and invariants above now standardize on the internal id everywhere.
