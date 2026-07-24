# Hidden Traitor Win Condition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sixth `win_condition`, `hidden_traitor`, so clubs can record games (e.g. *Betrayal at the House on the Hill*) where a named role, a different named role, or neither (a per-game "the house wins" label) can win — storing results in the existing `team_results` table, the same shape `team_based` already uses.

**Architecture:** Extend the `win_condition` enum and add three nullable label columns (`role_one_label`, `role_two_label`, `neither_label`) to `games`/`club_game_variants`, guarded by a new `CHECK` constraint. The write path (`writeResultRows`) gets one new switch case that writes to `team_results` exactly like `team_based`, using a reserved sentinel constant (not literal label text) to mean "neither role won." Three existing read functions (`getEventWinner`, `getSessionPlaySummaries`, `getPlayForEdit`) get small branches so their wording uses the game's configured labels instead of `team_based`'s hardcoded "Team X"/"Tied". `stats.ts` needs no changes — it already computes wins from `team_results.won` independent of which win condition produced the rows.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM against Neon Postgres (`@neondatabase/serverless` + `drizzle-orm/neon-http`), Clerk auth, no unit test framework — this repo verifies the data layer with two bespoke scripts (`scripts/verify-schema.js` runs raw SQL against the live schema; `scripts/verify-data-layer.js` compiles and calls the actual `src/app/lib/db/*` functions) run via `npm run db:verify` / `npm run db:verify-layer`.

**Full spec:** `docs/superpowers/specs/2026-07-24-hidden-traitor-win-condition-design.md`

---

### Task 1: Extend the Drizzle schema

**Files:**
- Modify: `src/db/schema.ts:15-21` (enum), `src/db/schema.ts:67-104` (`games`, `club_game_variants`)

- [ ] **Step 1: Add the enum value**

In `src/db/schema.ts`, change:

```ts
export const winConditionEnum = pgEnum("win_condition", [
  "leaderboard",
  "team_based",
  "cooperative",
  "single_winner",
  "single_loser",
]);
```

to:

```ts
export const winConditionEnum = pgEnum("win_condition", [
  "leaderboard",
  "team_based",
  "cooperative",
  "single_winner",
  "single_loser",
  "hidden_traitor",
]);
```

- [ ] **Step 2: Add the three label columns and constraint to `games`**

Change:

```ts
export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
  },
  (table) => [
    check(
      "games_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} = 'leaderboard' AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} <> 'leaderboard' AND ${table.scoringDirection} IS NULL)`
    ),
  ]
);
```

to:

```ts
export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
    roleOneLabel: text("role_one_label"),
    roleTwoLabel: text("role_two_label"),
    neitherLabel: text("neither_label"),
  },
  (table) => [
    check(
      "games_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} = 'leaderboard' AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} <> 'leaderboard' AND ${table.scoringDirection} IS NULL)`
    ),
    check(
      "games_hidden_traitor_labels_required",
      sql`(${table.winCondition} = 'hidden_traitor'
            AND ${table.roleOneLabel} IS NOT NULL
            AND ${table.roleTwoLabel} IS NOT NULL
            AND ${table.neitherLabel} IS NOT NULL)
          OR (${table.winCondition} <> 'hidden_traitor'
            AND ${table.roleOneLabel} IS NULL
            AND ${table.roleTwoLabel} IS NULL
            AND ${table.neitherLabel} IS NULL)`
    ),
  ]
);
```

- [ ] **Step 3: Same three columns and constraint on `club_game_variants`**

Change:

```ts
export const clubGameVariants = pgTable(
  "club_game_variants",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.gameId] }),
    check(
      "club_game_variants_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} = 'leaderboard' AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} <> 'leaderboard' AND ${table.scoringDirection} IS NULL)`
    ),
  ]
);
```

to:

```ts
export const clubGameVariants = pgTable(
  "club_game_variants",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    winCondition: winConditionEnum("win_condition").notNull(),
    scoringDirection: scoringDirectionEnum("scoring_direction"),
    roleOneLabel: text("role_one_label"),
    roleTwoLabel: text("role_two_label"),
    neitherLabel: text("neither_label"),
  },
  (table) => [
    primaryKey({ columns: [table.clubId, table.gameId] }),
    check(
      "club_game_variants_scoring_direction_matches_win_condition",
      sql`(${table.winCondition} = 'leaderboard' AND ${table.scoringDirection} IS NOT NULL)
          OR (${table.winCondition} <> 'leaderboard' AND ${table.scoringDirection} IS NULL)`
    ),
    check(
      "club_game_variants_hidden_traitor_labels_required",
      sql`(${table.winCondition} = 'hidden_traitor'
            AND ${table.roleOneLabel} IS NOT NULL
            AND ${table.roleTwoLabel} IS NOT NULL
            AND ${table.neitherLabel} IS NOT NULL)
          OR (${table.winCondition} <> 'hidden_traitor'
            AND ${table.roleOneLabel} IS NULL
            AND ${table.roleTwoLabel} IS NULL
            AND ${table.neitherLabel} IS NULL)`
    ),
  ]
);
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (schema-only change; nothing consumes the new columns yet).

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): add hidden_traitor win condition to schema"
```

---

### Task 2: Generate and apply the migration

**Files:**
- Create: `drizzle/000X_<generated-name>.sql` (exact filename is whatever Drizzle Kit assigns; content predicted below)

- [ ] **Step 1: Generate the migration**

```bash
npm run db:generate
```

- [ ] **Step 2: Inspect the generated file**

Open the new file in `drizzle/`. Expected shape (statement order/whitespace may differ slightly — that's fine, this is a generated artifact; what matters is that it does these seven things and nothing else):

```sql
ALTER TYPE "public"."win_condition" ADD VALUE 'hidden_traitor';--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "role_one_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "role_two_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "neither_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "role_one_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "role_two_label" text;--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD COLUMN "neither_label" text;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_hidden_traitor_labels_required" CHECK (("games"."win_condition" = 'hidden_traitor' AND "games"."role_one_label" IS NOT NULL AND "games"."role_two_label" IS NOT NULL AND "games"."neither_label" IS NOT NULL) OR ("games"."win_condition" <> 'hidden_traitor' AND "games"."role_one_label" IS NULL AND "games"."role_two_label" IS NULL AND "games"."neither_label" IS NULL));--> statement-breakpoint
ALTER TABLE "club_game_variants" ADD CONSTRAINT "club_game_variants_hidden_traitor_labels_required" CHECK (("club_game_variants"."win_condition" = 'hidden_traitor' AND "club_game_variants"."role_one_label" IS NOT NULL AND "club_game_variants"."role_two_label" IS NOT NULL AND "club_game_variants"."neither_label" IS NOT NULL) OR ("club_game_variants"."win_condition" <> 'hidden_traitor' AND "club_game_variants"."role_one_label" IS NULL AND "club_game_variants"."role_two_label" IS NULL AND "club_game_variants"."neither_label" IS NULL));
```

If the generated file differs meaningfully (e.g. it tries to drop/recreate the enum type instead of `ADD VALUE`, which some drizzle-kit versions do when they can't diff enum additions cleanly), stop and fix `schema.ts` or hand-edit the migration before proceeding — do not apply a migration that recreates `win_condition` from scratch, since that would require dropping and rebuilding every column that uses it.

- [ ] **Step 3: Confirm target database with the user before applying**

This runs against the real database configured in `.env.local` (`STORAGE_DATABASE_URL_UNPOOLED` / `STORAGE_DATABASE_URL`). Check which database that is (`grep STORAGE_DATABASE_URL .env.local`, redacting the password when quoting it back) and confirm with the user before running the next step — same checkpoint the original schema-redesign migration used.

- [ ] **Step 4: Apply the migration**

```bash
npm run db:migrate
```

Expected: exits 0, no errors. (If `drizzle-kit migrate` fails silently as it once did under the old `@vercel/postgres` driver, the migrations table it tracks is `drizzle.__drizzle_migrations` — check that table for a partial application before retrying.)

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(db): migrate in hidden_traitor win condition"
```

---

### Task 3: Extend the schema verification script

**Files:**
- Modify: `scripts/verify-schema.js`

- [ ] **Step 1: Add hidden_traitor assertions**

In `checkRoundTripAndConstraints`, insert this block right after the existing `console.log('CHECK constraint correctly rejected an invalid win_condition/scoring_direction combination.');` line and before the function's closing `} finally {`:

```js
    const hiddenTraitorGame = await client.query(
      `INSERT INTO games (name, win_condition, role_one_label, role_two_label, neither_label)
       VALUES ('Verify Hidden Traitor Game', 'hidden_traitor', 'Heroes', 'Traitor', 'The house wins')
       RETURNING id, role_one_label, role_two_label, neither_label`
    );
    if (
      hiddenTraitorGame.rows[0].role_one_label !== 'Heroes' ||
      hiddenTraitorGame.rows[0].role_two_label !== 'Traitor' ||
      hiddenTraitorGame.rows[0].neither_label !== 'The house wins'
    ) {
      throw new Error('hidden_traitor role/neither labels did not round-trip correctly');
    }
    console.log('hidden_traitor game round-trips role_one_label/role_two_label/neither_label correctly.');

    let hiddenTraitorMissingLabelRejected = false;
    try {
      await client.query(
        `INSERT INTO games (name, win_condition, role_one_label, role_two_label)
         VALUES ('Bad Hidden Traitor Game', 'hidden_traitor', 'Heroes', 'Traitor')`
      );
    } catch (err) {
      hiddenTraitorMissingLabelRejected = /hidden_traitor_labels_required/.test(err.message);
    }
    if (!hiddenTraitorMissingLabelRejected) {
      throw new Error('Expected the hidden_traitor labels CHECK constraint to reject a hidden_traitor game missing neither_label, but it did not.');
    }
    console.log('CHECK constraint correctly rejected a hidden_traitor game missing a required label.');

    let nonHiddenTraitorLabelRejected = false;
    try {
      await client.query(
        `INSERT INTO games (name, win_condition, role_one_label)
         VALUES ('Bad Cooperative Game', 'cooperative', 'Heroes')`
      );
    } catch (err) {
      nonHiddenTraitorLabelRejected = /hidden_traitor_labels_required/.test(err.message);
    }
    if (!nonHiddenTraitorLabelRejected) {
      throw new Error('Expected the hidden_traitor labels CHECK constraint to reject a non-hidden_traitor game with a role label set, but it did not.');
    }
    console.log('CHECK constraint correctly rejected a non-hidden_traitor game with a stray role label set.');
```

- [ ] **Step 2: Run it and confirm it passes against the now-migrated database**

```bash
npm run db:verify
```

Expected: ends with `Schema verification passed.` including the three new log lines above.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-schema.js
git commit -m "test(db): verify hidden_traitor label columns and CHECK constraint"
```

---

### Task 4: Extend `rules.ts` to resolve the three labels

**Files:**
- Modify: `src/app/lib/db/rules.ts` (whole file, 45 lines)

- [ ] **Step 1: Replace the file contents**

```ts
// src/app/lib/db/rules.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clubGameVariants, games, winConditionEnum, scoringDirectionEnum } from "@/db/schema";

export type DbWinCondition = (typeof winConditionEnum.enumValues)[number];
export type DbScoringDirection = (typeof scoringDirectionEnum.enumValues)[number];

export type EffectiveRules = {
  winCondition: DbWinCondition;
  scoringDirection: DbScoringDirection | null;
  roleOneLabel: string | null;
  roleTwoLabel: string | null;
  neitherLabel: string | null;
};

export async function resolveEffectiveRules(
  clubId: string,
  gameId: string
): Promise<EffectiveRules> {
  const [variant] = await db
    .select({
      winCondition: clubGameVariants.winCondition,
      scoringDirection: clubGameVariants.scoringDirection,
      roleOneLabel: clubGameVariants.roleOneLabel,
      roleTwoLabel: clubGameVariants.roleTwoLabel,
      neitherLabel: clubGameVariants.neitherLabel,
    })
    .from(clubGameVariants)
    .where(and(eq(clubGameVariants.clubId, clubId), eq(clubGameVariants.gameId, gameId)));

  if (variant) {
    return variant;
  }

  const [game] = await db
    .select({
      winCondition: games.winCondition,
      scoringDirection: games.scoringDirection,
      roleOneLabel: games.roleOneLabel,
      roleTwoLabel: games.roleTwoLabel,
      neitherLabel: games.neitherLabel,
    })
    .from(games)
    .where(eq(games.id, gameId));

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  return game;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors in files that construct `EffectiveRules`-shaped objects without the three new fields, or none if none do yet (this repo's only producer of `EffectiveRules` is `resolveEffectiveRules` itself). If there are errors, they'll point at the next tasks' files before those are done — that's expected at this point in the plan; re-run after Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/db/rules.ts
git commit -m "feat(db): resolve hidden_traitor role/neither labels in effective rules"
```

---

### Task 5: Add the shared `NO_WINNER_SENTINEL` constant and extend `BoardGame`

**Files:**
- Modify: `src/app/lib/definitions.ts`

- [ ] **Step 1: Add the sentinel constant and extend `BoardGame`**

`definitions.ts` has no `"use server"` or `"server-only"` directive, so it's the one module both the client-side `ResultForm.tsx` and the server action `results-actions.ts` can safely import from. (A `"use server"` file may only export async functions, so the sentinel can't live in `results-actions.ts`; `"server-only"` would break the client import if it lived in `rules.ts`.)

Change:

```ts
import { UUID } from "crypto";

export type Player = {
```

to:

```ts
import { UUID } from "crypto";

// Reserved sentinel for the hidden_traitor win condition's "neither role
// won" outcome, submitted as the winner form field's value instead of a
// role's literal label text - keeps "nobody won" detection independent of
// whatever free-text label a club chose for roleOneLabel/roleTwoLabel.
export const NO_WINNER_SENTINEL = "__no_winner__";

export type Player = {
```

Change:

```ts
export type BoardGame = {
  id: UUID;
  clubId: UUID;
  name: string;
  winCondition: string;
  scoringDirection: string;
  hasVariant: boolean;
};
```

to:

```ts
export type BoardGame = {
  id: UUID;
  clubId: UUID;
  name: string;
  winCondition: string;
  scoringDirection: string;
  hasVariant: boolean;
  roleOneLabel: string | null;
  roleTwoLabel: string | null;
  neitherLabel: string | null;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/definitions.ts
git commit -m "feat: add NO_WINNER_SENTINEL and extend BoardGame with hidden_traitor labels"
```

---

### Task 6: Extend `games.ts` (UI code mapping and read functions)

**Files:**
- Modify: `src/app/lib/db/games.ts` (whole file, 81 lines)

- [ ] **Step 1: Replace the file contents**

```ts
// src/app/lib/db/games.ts
//
// Reads only. Mutations live in games-actions.ts - see the header comment
// in players.ts for why this split exists.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { BoardGame } from "@/app/lib/definitions";
import type { DbWinCondition, DbScoringDirection } from "./rules";

// Exported so games-actions.ts can reuse the same mapping tables rather
// than duplicating them (and risking the two copies drifting apart).
export const WIN_CONDITION_DB_TO_UI: Record<DbWinCondition, string> = {
  leaderboard: "0",
  team_based: "1",
  cooperative: "2",
  single_winner: "3",
  single_loser: "4",
  hidden_traitor: "5",
};

export const WIN_CONDITION_UI_TO_DB: Record<string, DbWinCondition> = {
  "0": "leaderboard",
  "1": "team_based",
  "2": "cooperative",
  "3": "single_winner",
  "4": "single_loser",
  "5": "hidden_traitor",
};

export const SCORING_DIRECTION_DB_TO_UI: Record<DbScoringDirection, string> = {
  high: "High",
  low: "Low",
};

export const SCORING_DIRECTION_UI_TO_DB: Record<string, DbScoringDirection> = {
  High: "high",
  Low: "low",
};

export async function getAllBoardgames(clubId: string): Promise<BoardGame[]> {
  const allGames = await db.select().from(games);
  const variants = await db
    .select()
    .from(clubGameVariants)
    .where(eq(clubGameVariants.clubId, clubId));

  const variantByGameId = new Map(variants.map((v) => [v.gameId, v]));

  return allGames.map((game) => {
    const variant = variantByGameId.get(game.id);
    const effective = variant ?? game;
    return {
      id: game.id,
      clubId,
      name: game.name,
      winCondition: WIN_CONDITION_DB_TO_UI[effective.winCondition],
      scoringDirection: effective.scoringDirection
        ? SCORING_DIRECTION_DB_TO_UI[effective.scoringDirection]
        : "",
      hasVariant: Boolean(variant),
      roleOneLabel: effective.roleOneLabel,
      roleTwoLabel: effective.roleTwoLabel,
      neitherLabel: effective.neitherLabel,
    } as BoardGame;
  });
}

export async function getBoardgameById(id: string): Promise<BoardGame> {
  const [game] = await db.select().from(games).where(eq(games.id, id));
  if (!game) {
    throw new Error(`Game ${id} not found`);
  }
  return {
    id: game.id,
    clubId: "",
    name: game.name,
    winCondition: WIN_CONDITION_DB_TO_UI[game.winCondition],
    scoringDirection: game.scoringDirection
      ? SCORING_DIRECTION_DB_TO_UI[game.scoringDirection]
      : "",
    hasVariant: false,
    roleOneLabel: game.roleOneLabel,
    roleTwoLabel: game.roleTwoLabel,
    neitherLabel: game.neitherLabel,
  } as unknown as BoardGame;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/db/games.ts
git commit -m "feat(db): expose hidden_traitor UI code and labels from games.ts"
```

---

### Task 7: Extend `games-actions.ts` (Add Game write path)

**Files:**
- Modify: `src/app/lib/db/games-actions.ts` (whole file, 57 lines)

- [ ] **Step 1: Replace the file contents**

```ts
"use server";
// src/app/lib/db/games-actions.ts
//
// Every Server Action for the games/catalog domain. Split out of games.ts -
// see the header comment in players.ts for why. Must NOT `import "server-only"`.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { WIN_CONDITION_UI_TO_DB, SCORING_DIRECTION_UI_TO_DB } from "./games";
import { checkIfPlayerIsClubMember } from "./players";

export async function addNewBoardGame(formData: FormData) {
  const name = formData.get("gameName")?.toString();
  const winConditionUi = formData.get("winCondition")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const scoringDirectionUi = formData.get("scoringDirection")?.toString();
  const roleOneLabel = formData.get("roleOneLabel")?.toString().trim() || null;
  const roleTwoLabel = formData.get("roleTwoLabel")?.toString().trim() || null;
  const neitherLabel = formData.get("neitherLabel")?.toString().trim() || null;

  if (!name || !winConditionUi || !clubId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  const winCondition = WIN_CONDITION_UI_TO_DB[winConditionUi];
  const scoringDirection = scoringDirectionUi
    ? SCORING_DIRECTION_UI_TO_DB[scoringDirectionUi]
    : null;

  if (winCondition === "hidden_traitor") {
    if (!roleOneLabel || !roleTwoLabel || !neitherLabel) {
      throw new Error("Hidden traitor games require role one, role two, and neither-wins labels");
    }
    const labels = [roleOneLabel, roleTwoLabel, neitherLabel];
    if (new Set(labels).size !== labels.length) {
      throw new Error("Hidden traitor labels must be distinct");
    }
  }

  const ruleFields = {
    winCondition,
    scoringDirection,
    roleOneLabel: winCondition === "hidden_traitor" ? roleOneLabel : null,
    roleTwoLabel: winCondition === "hidden_traitor" ? roleTwoLabel : null,
    neitherLabel: winCondition === "hidden_traitor" ? neitherLabel : null,
  };

  const [existingGame] = await db.select().from(games).where(eq(games.name, name));

  if (!existingGame) {
    await db.insert(games).values({ id: uuidv4(), name, ...ruleFields });
  } else if (
    existingGame.winCondition !== ruleFields.winCondition ||
    existingGame.scoringDirection !== ruleFields.scoringDirection ||
    existingGame.roleOneLabel !== ruleFields.roleOneLabel ||
    existingGame.roleTwoLabel !== ruleFields.roleTwoLabel ||
    existingGame.neitherLabel !== ruleFields.neitherLabel
  ) {
    await db
      .insert(clubGameVariants)
      .values({ clubId, gameId: existingGame.id, ...ruleFields })
      .onConflictDoUpdate({
        target: [clubGameVariants.clubId, clubGameVariants.gameId],
        set: ruleFields,
      });
  }

  redirect(`/clubs/${clubId}`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/db/games-actions.ts
git commit -m "feat(db): write hidden_traitor labels and validate them in addNewBoardGame"
```

---

### Task 8: Extend `results-actions.ts` (write path)

**Files:**
- Modify: `src/app/lib/db/results-actions.ts:13-28` (imports), `:52-125` (`writeResultRows`)

- [ ] **Step 1: Import the sentinel**

Change:

```ts
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import {
  plays,
  sessions,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { resolveEffectiveRules, type EffectiveRules } from "./rules";
import { checkIfPlayerIsClubMember } from "./players";
```

to:

```ts
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import {
  plays,
  sessions,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { resolveEffectiveRules, type EffectiveRules } from "./rules";
import { checkIfPlayerIsClubMember } from "./players";
import { NO_WINNER_SENTINEL } from "@/app/lib/definitions";
```

- [ ] **Step 2: Add the `hidden_traitor` case**

Change:

```ts
    case "team_based": {
      const winningTeam = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(teamResults).values({
          playId,
          playerId: entry.playerId,
          team: entry.team,
          won: winningTeam !== "Tie" && entry.team === winningTeam,
        });
      }
      break;
    }

    case "cooperative": {
```

to:

```ts
    case "team_based": {
      const winningTeam = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(teamResults).values({
          playId,
          playerId: entry.playerId,
          team: entry.team,
          won: winningTeam !== "Tie" && entry.team === winningTeam,
        });
      }
      break;
    }

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

    case "cooperative": {
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/results-actions.ts
git commit -m "feat(db): write hidden_traitor results using NO_WINNER_SENTINEL"
```

---

### Task 9: Extend `results.ts` (read paths)

**Files:**
- Modify: `src/app/lib/db/results.ts:85-126` (`getEventWinner`), `:263-268` (team branch of `getSessionPlaySummaries`), `:351` (`getPlayForEdit`)

- [ ] **Step 1: Fix `getEventWinner`'s no-winner wording**

Change:

```ts
export async function getEventWinner(playId: string): Promise<GameAndWinner> {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) {
    return { id: playId as any, winner: "" };
  }

  const [teamRows, outcomeRows] = await Promise.all([
    db.select().from(teamResults).where(eq(teamResults.playId, playId)),
    db.select().from(outcomeResults).where(eq(outcomeResults.playId, playId)),
  ]);

  if (teamRows.length > 0) {
    const winningRow = teamRows.find((row) => row.won);
    return { id: playId as any, winner: winningRow ? winningRow.team : "Tied" };
  }
```

to:

```ts
export async function getEventWinner(playId: string): Promise<GameAndWinner> {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) {
    return { id: playId as any, winner: "" };
  }

  const [teamRows, outcomeRows] = await Promise.all([
    db.select().from(teamResults).where(eq(teamResults.playId, playId)),
    db.select().from(outcomeResults).where(eq(outcomeResults.playId, playId)),
  ]);

  if (teamRows.length > 0) {
    const winningRow = teamRows.find((row) => row.won);
    if (winningRow) {
      return { id: playId as any, winner: winningRow.team };
    }
    // No team_results row has won: true. team_based calls this "Tied"; a
    // hidden_traitor play instead uses the game's configured neitherLabel
    // ("The house wins" etc), resolved through the same club-variant-aware
    // path every other read site uses.
    const [session] = await db.select().from(sessions).where(eq(sessions.id, play.sessionId));
    const rules = session ? await resolveEffectiveRules(session.clubId, play.gameId) : null;
    const noWinnerLabel =
      rules?.winCondition === "hidden_traitor" && rules.neitherLabel ? rules.neitherLabel : "Tied";
    return { id: playId as any, winner: noWinnerLabel };
  }
```

- [ ] **Step 2: Fix `getSessionPlaySummaries`'s team branch wording**

Change:

```ts
    } else if (teamRows.length > 0) {
      const winners = teamRows.filter((r) => r.won).map((r) => nameFor(r.playerId));
      const losers = teamRows.filter((r) => !r.won).map((r) => nameFor(r.playerId));
      const winningTeam = teamRows.find((r) => r.won)?.team;
      summary = winningTeam ? `Team ${winningTeam} won` : "Tied";
      detail = `${winners.join(", ") || "No one"} beat ${losers.join(", ") || "no one"}`;
    } else if (rules.winCondition === "cooperative") {
```

to:

```ts
    } else if (teamRows.length > 0) {
      const winners = teamRows.filter((r) => r.won).map((r) => nameFor(r.playerId));
      const losers = teamRows.filter((r) => !r.won).map((r) => nameFor(r.playerId));
      const winningTeam = teamRows.find((r) => r.won)?.team;
      const isHiddenTraitor = rules.winCondition === "hidden_traitor";
      const noWinnerLabel = isHiddenTraitor && rules.neitherLabel ? rules.neitherLabel : "Tied";
      // hidden_traitor's stored `team` value is already the club's real role
      // label (e.g. "Traitor") - team_based's generic "Team A" prefix reads
      // oddly ("Team Traitor won") applied to a role name, so it's dropped
      // for hidden_traitor.
      summary = winningTeam ? (isHiddenTraitor ? `${winningTeam} won` : `Team ${winningTeam} won`) : noWinnerLabel;
      detail = `${winners.join(", ") || "No one"} beat ${losers.join(", ") || "no one"}`;
    } else if (rules.winCondition === "cooperative") {
```

- [ ] **Step 3: Extend `getPlayForEdit`'s team branch to cover `hidden_traitor`**

Change:

```ts
  if (rules.winCondition === "team_based") {
    const rows = await db.select().from(teamResults).where(eq(teamResults.playId, playId));
```

to:

```ts
  if (rules.winCondition === "team_based" || rules.winCondition === "hidden_traitor") {
    const rows = await db.select().from(teamResults).where(eq(teamResults.playId, playId));
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/db/results.ts
git commit -m "feat(db): use hidden_traitor role/neither labels in winner and summary reads"
```

---

### Task 10: Extend the data-access-layer verification script

**Files:**
- Modify: `scripts/verify-data-layer.js`

- [ ] **Step 1: Add a hidden_traitor section**

Insert this block right after the existing section 8 (`getPlayForEdit`) console.log line — `console.log('results.ts getPlayForEdit OK (leaderboard rehydration, team rehydration, missing play)');` — and before the `} finally {`:

```js
    // ------------------------------------------------------------------
    // 9. rules.ts / results.ts / games.ts - hidden_traitor: label
    //    resolution, a role-win play, and a "neither role won" play. New
    //    session so this section's plays don't affect section 6's
    //    already-asserted getClubStats counts.
    // ------------------------------------------------------------------
    const [gameHiddenTraitor] = await db
      .insert(schema.games)
      .values({
        name: `${MARKER}-Hidden Traitor Game`,
        winCondition: 'hidden_traitor',
        scoringDirection: null,
        roleOneLabel: 'Heroes',
        roleTwoLabel: 'Traitor',
        neitherLabel: 'The house wins',
      })
      .returning();
    fixtures.gameIds.push(gameHiddenTraitor.id);

    const hiddenTraitorRules = await rules.resolveEffectiveRules(club.id, gameHiddenTraitor.id);
    assertEqual(hiddenTraitorRules.winCondition, 'hidden_traitor', 'resolveEffectiveRules should resolve hidden_traitor');
    assertEqual(hiddenTraitorRules.roleOneLabel, 'Heroes', 'resolveEffectiveRules roleOneLabel mismatch');
    assertEqual(hiddenTraitorRules.roleTwoLabel, 'Traitor', 'resolveEffectiveRules roleTwoLabel mismatch');
    assertEqual(hiddenTraitorRules.neitherLabel, 'The house wins', 'resolveEffectiveRules neitherLabel mismatch');

    const hiddenTraitorBoardgame = await games.getBoardgameById(gameHiddenTraitor.id);
    assertEqual(hiddenTraitorBoardgame.roleOneLabel, 'Heroes', 'getBoardgameById should expose roleOneLabel');
    assertEqual(hiddenTraitorBoardgame.roleTwoLabel, 'Traitor', 'getBoardgameById should expose roleTwoLabel');
    assertEqual(hiddenTraitorBoardgame.neitherLabel, 'The house wins', 'getBoardgameById should expose neitherLabel');

    const [hiddenTraitorSession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Hidden Traitor Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(hiddenTraitorSession.id);

    // Play A: Heroes (ownerPlayer) beat the Traitor (memberPlayer).
    const [playHeroesWon] = await db
      .insert(schema.plays)
      .values({ sessionId: hiddenTraitorSession.id, gameId: gameHiddenTraitor.id })
      .returning();
    fixtures.playIds.push(playHeroesWon.id);
    await db.insert(schema.teamResults).values([
      { playId: playHeroesWon.id, playerId: ownerPlayer.id, team: 'Heroes', won: true },
      { playId: playHeroesWon.id, playerId: memberPlayer.id, team: 'Traitor', won: false },
    ]);

    const heroesWinner = await results.getEventWinner(playHeroesWon.id);
    assertEqual(heroesWinner.winner, 'Heroes', 'getEventWinner should name the winning role for a hidden_traitor play');

    const heroesSummaries = await results.getSessionPlaySummaries(club.id, hiddenTraitorSession.id);
    const heroesSummary = heroesSummaries.find((s) => s.playId === playHeroesWon.id);
    assert(heroesSummary, 'missing hidden_traitor role-win play summary');
    assertEqual(heroesSummary.summary, 'Heroes won', 'hidden_traitor summary should read "<role> won", not "Team <role> won"');

    // Play B: nobody wins - the house wins.
    const [playHouseWon] = await db
      .insert(schema.plays)
      .values({ sessionId: hiddenTraitorSession.id, gameId: gameHiddenTraitor.id })
      .returning();
    fixtures.playIds.push(playHouseWon.id);
    await db.insert(schema.teamResults).values([
      { playId: playHouseWon.id, playerId: ownerPlayer.id, team: 'Heroes', won: false },
      { playId: playHouseWon.id, playerId: memberPlayer.id, team: 'Traitor', won: false },
    ]);

    const houseWinner = await results.getEventWinner(playHouseWon.id);
    assertEqual(houseWinner.winner, 'The house wins', "getEventWinner should return the game's neitherLabel, not 'Tied', when no hidden_traitor role won");

    const houseSummaries = await results.getSessionPlaySummaries(club.id, hiddenTraitorSession.id);
    const houseSummary = houseSummaries.find((s) => s.playId === playHouseWon.id);
    assert(houseSummary, 'missing hidden_traitor no-winner play summary');
    assertEqual(houseSummary.summary, 'The house wins', "hidden_traitor no-winner summary should use the game's neitherLabel");

    const hiddenTraitorEdit = await results.getPlayForEdit(club.id, playHeroesWon.id);
    assert(hiddenTraitorEdit, 'getPlayForEdit should find the hidden_traitor play');
    assertEqual(hiddenTraitorEdit.winCondition, 'hidden_traitor', 'hidden_traitor edit data should resolve effective win condition');
    assertEqual(hiddenTraitorEdit.teamByPlayerId[ownerPlayer.id], 'Heroes', 'hidden_traitor edit data should carry owner role assignment');
    assertEqual(hiddenTraitorEdit.teamByPlayerId[memberPlayer.id], 'Traitor', 'hidden_traitor edit data should carry member role assignment');
    assertEqual(hiddenTraitorEdit.winningTeam, 'Heroes', 'hidden_traitor edit data should identify the winning role from the won:true row');

    console.log('rules.ts / results.ts / games.ts hidden_traitor OK (label resolution, role-win summary/winner, no-winner summary/winner using neitherLabel, edit rehydration)');
```

- [ ] **Step 2: Run it**

```bash
npm run db:verify-layer
```

Expected: ends with `Data-access layer verification passed.` including the new log line above. If it fails on `resolveEffectiveRules`/`getPlayForEdit` type errors, re-check Task 4's `EffectiveRules` fields exactly match what Task 9 reads.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-data-layer.js
git commit -m "test(db): verify hidden_traitor read paths in the data-access layer"
```

---

### Task 11: `AddGameForm.tsx` UI

**Files:**
- Modify: `src/app/ui/clubs/AddGameForm.tsx` (whole file, 93 lines)

- [ ] **Step 1: Replace the file contents**

```tsx
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
  const hiddenTraitorLabels = [roleOneLabel.trim(), roleTwoLabel.trim(), neitherLabel.trim()];
  const hiddenTraitorLabelsValid =
    hiddenTraitorLabels.every((label) => label.length > 0) &&
    new Set(hiddenTraitorLabels).size === hiddenTraitorLabels.length;
  const canSubmit =
    name.trim().length > 0 && winCondition !== "" && (!isHiddenTraitor || hiddenTraitorLabelsValid);

  return (
    <form action={addNewBoardGame} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      {isLeaderboard && <input type="hidden" name="scoringDirection" value={direction} />}
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/clubs/AddGameForm.tsx
git commit -m "feat(ui): add hidden_traitor option and label inputs to Add Game form"
```

---

### Task 12: `ResultForm.tsx` UI

**Files:**
- Modify: `src/app/ui/clubs/ResultForm.tsx` (whole file, 283 lines)

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";
import { useState } from "react";
import { recordPlayResults, updatePlayResults } from "@/app/lib/db/results-actions";
import { BoardGame, Player, NO_WINNER_SENTINEL } from "@/app/lib/definitions";
import type { PlayEditData } from "@/app/lib/db/results";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

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
      {winCode === "5" && <input type="hidden" name="winner" value={winningTeam} />}

      {(winCode === "0" || winCode === "1" || winCode === "2") &&
        selectedMembers.map((m) => {
          const csv =
            winCode === "0" ? `true,${scores[m.id] || "0"},` : winCode === "1" ? `true,,${teams[m.id]}` : `true,,`;
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/clubs/ResultForm.tsx
git commit -m "feat(ui): add hidden_traitor role assignment and winner picker to Result form"
```

---

### Task 13: Build and manual browser verification

**Files:** none (verification only)

Per this project's established habit: `tsc`/`eslint` passing does not mean the Next.js build or `"use server"`/`server-only` wiring actually works — this task is the one that would have caught the `NO_WINNER_SENTINEL`-placement mistake described in Task 5 if it had been gotten wrong.

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: exits 0. If it errors on `results-actions.ts` with something like "A 'use server' file can only export async functions", the sentinel constant ended up in the wrong file — it must live in `definitions.ts` (no directive), not `results-actions.ts` (`"use server"`) or `rules.ts` (`"server-only"`).

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Add-game walkthrough**

In the browser: open a club, go to Add Game, select "Hidden traitor", fill in role one ("Heroes"), role two ("Traitor"), and the neither-wins label ("The house wins") — confirm the "Add game" button stays disabled until all three are filled and distinct, then submit.

- [ ] **Step 4: Record-result walkthrough (role wins)**

Start a session, add a result for the new game, assign players across "Heroes"/"Traitor" using the toggle buttons, pick "Heroes" as the winner, save. Confirm the session's play summary reads "Heroes won" (not "Team Heroes won" or "Tied").

- [ ] **Step 5: Record-result walkthrough (house wins)**

Add a second result for the same game, leave the winner picker on "The house wins" (its default), save. Confirm the summary reads "The house wins" verbatim.

- [ ] **Step 6: Edit walkthrough**

Edit the first result (the Heroes win) — confirm the role assignments and the winner selection are pre-filled correctly, not reset to defaults.

- [ ] **Step 7: Club stats check**

Open the club's stats screen and confirm the players assigned to the winning role in each play show one additional win, and the losing/traitor-side players don't.

- [ ] **Step 8: Stop the dev server**

No commit for this task — it's verification only. If any step surfaced a bug, fix it in the relevant task's file, re-run `npx tsc --noEmit` and this task's steps, then commit the fix with a message describing what was wrong (e.g. `fix(ui): hidden_traitor winner picker did not reset on game switch`).

---

## Post-implementation

Once all 13 tasks are done and Task 13's manual walkthrough passes, use the `superpowers:finishing-a-development-branch` skill to decide how to land this work (direct merge, PR, etc.) — this plan doesn't prescribe that, since it depends on how the user works day-to-day.
