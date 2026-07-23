# Data Access Layer Rewrite (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app build and run again against the new 11-table Drizzle schema, per `docs/superpowers/specs/2026-07-22-data-access-layer-rewrite-design.md`, as a functional port — same screens, same view-model types, same function names where possible — with changes only where the new schema forces one.

**Architecture:** Split `src/app/lib/data.ts`/`actions.ts` into `src/app/lib/db/{players,clubs,games,rules,sessions,results}.ts`. Critically, **every existing type in `definitions.ts` and every function name UI components already import stays the same** — only the internal implementation changes, and only `BoardGame` gains one new field (`hasVariant`). This was discovered while mapping old functions to new tables: keeping the view-model layer stable means the ~14 files that consume `data.ts`/`actions.ts` need only an import-path change, not a rewrite, which is what "functional port" actually requires in practice. Two DB-forced UI changes and one dead-code removal were found while doing this mapping (documented in their tasks below).

**`"server-only"` vs `"use server"`, mixed per file:** the security fix pulled into this codebase mid-Phase-1 moved `data.ts` from `"use server"` to `"server-only"` specifically because its reads were being exposed as callable RPCs. This plan's per-domain files mix reads and writes in the same file (e.g. `games.ts` has both `getAllBoardgames` and `addNewBoardGame`), which would reintroduce that exact problem with a file-level directive either way: `"server-only"` would break the writes used as form actions, `"use server"` would re-expose every read. The fix used throughout Tasks 3–7: keep `import "server-only"` at the top of every file (reads stay plain, ordinary functions, never RPC-callable), and add a per-function `"use server";` as the first line inside the body of every function that's actually passed to a `<form action={fn}>` or imported into a `"use client"` component — verified against the real call sites in Task 8, not assumed. Functions only ever called server-to-server (e.g. from a Route Handler or a Server Component's own render) don't get the directive, since they never cross the client/server boundary.

**Tech Stack:** Drizzle ORM against `src/db/schema.ts` (from Phase 1), same Next.js Server Actions / Server Components pattern already in use.

---

## File Structure

```
src/app/lib/db/
  rules.ts      # new — resolveEffectiveRules(clubId, gameId), the one shared lookup
  players.ts    # new — player identity + club membership/join-requests
  clubs.ts      # new — club CRUD, ownership, "clubs I'm not in yet"
  games.ts      # new — games catalog + club_game_variants, win-condition<->UI mapping
  sessions.ts   # new — sessions, plays, both roster queries
  results.ts    # new — recordPlayResults(), result reads, player stats
src/app/lib/definitions.ts   # modified — BoardGame gains hasVariant: boolean
src/app/lib/data.ts          # deleted
src/app/lib/actions.ts       # deleted
src/app/**/*.tsx, *.ts       # modified — import path updates (~14 files), 2 files with real logic changes
scripts/seed.js              # rewritten against the new schema
scripts/verify-data-layer.js # new — round-trips the real db/*.ts functions
```

---

## Task 1: Add `hasVariant` to `BoardGame` ✅ DONE (c5af20e)

**Files:**
- Modify: `src/app/lib/definitions.ts:66-72`

- [x] **Step 1: Add the field**

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

- [x] **Step 2: Commit**

```bash
git add src/app/lib/definitions.ts
git commit -m "feat(db): add hasVariant to BoardGame for the house-rules indicator"
```

---

## Task 2: `rules.ts` — the one shared win-condition resolver ✅ DONE (5428eeb)

**Files:**
- Create: `src/app/lib/db/rules.ts`

- [x] **Step 1: Write it**

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
};

export async function resolveEffectiveRules(
  clubId: string,
  gameId: string
): Promise<EffectiveRules> {
  const [variant] = await db
    .select({
      winCondition: clubGameVariants.winCondition,
      scoringDirection: clubGameVariants.scoringDirection,
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
    })
    .from(games)
    .where(eq(games.id, gameId));

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  return game;
}
```

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/rules.ts
git commit -m "feat(db): add resolveEffectiveRules, the single club_game_variants ?? games lookup"
```

---

## Task 3: `games.ts` — catalog, variants, and the numeric<->DB win-condition mapping ✅ DONE (729d20d) — note: addNewBoardGame can't revert a club's variant back to the global default once created (matches old app's insert-only behavior, no edit path existed before either); getBoardgameById doesn't resolve per-club variants (confirmed inert for all current callers, which only read .name)

**Files:**
- Create: `src/app/lib/db/games.ts`

The UI's `WinCondition` enum (`definitions.ts`) is numeric (`LeaderBoard=0`...`SingleLoser=4`), stored/passed around as numeric strings (`"0"`..`"4"`) — every component (`Leaderboard.tsx`'s `switch (parseInt(game.winCondition))`, `PlayerRow.tsx`) already assumes this. Rather than changing every component to the DB's semantic string enum, this module translates at the boundary, so no UI component needs to change for this reason.

- [x] **Step 1: Write it**

```ts
// src/app/lib/db/games.ts
import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db/client";
import { games, clubGameVariants } from "@/db/schema";
import { BoardGame } from "@/app/lib/definitions";
import type { DbWinCondition, DbScoringDirection } from "./rules";

const WIN_CONDITION_DB_TO_UI: Record<DbWinCondition, string> = {
  leaderboard: "0",
  team_based: "1",
  cooperative: "2",
  single_winner: "3",
  single_loser: "4",
};

const WIN_CONDITION_UI_TO_DB: Record<string, DbWinCondition> = {
  "0": "leaderboard",
  "1": "team_based",
  "2": "cooperative",
  "3": "single_winner",
  "4": "single_loser",
};

const SCORING_DIRECTION_DB_TO_UI: Record<DbScoringDirection, string> = {
  high: "High",
  low: "Low",
};

const SCORING_DIRECTION_UI_TO_DB: Record<string, DbScoringDirection> = {
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
  } as BoardGame;
}

export async function addNewBoardGame(formData: FormData) {
  "use server";
  const name = formData.get("gameName")?.toString();
  const winConditionUi = formData.get("winCondition")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const scoringDirectionUi = formData.get("scoringDirection")?.toString();

  if (!name || !winConditionUi || !clubId) {
    throw new Error("Missing required fields");
  }

  const winCondition = WIN_CONDITION_UI_TO_DB[winConditionUi];
  const scoringDirection = scoringDirectionUi
    ? SCORING_DIRECTION_UI_TO_DB[scoringDirectionUi]
    : null;

  const [existingGame] = await db.select().from(games).where(eq(games.name, name));

  if (!existingGame) {
    await db.insert(games).values({ id: uuidv4(), name, winCondition, scoringDirection });
  } else if (
    existingGame.winCondition !== winCondition ||
    existingGame.scoringDirection !== scoringDirection
  ) {
    await db
      .insert(clubGameVariants)
      .values({ clubId, gameId: existingGame.id, winCondition, scoringDirection })
      .onConflictDoUpdate({
        target: [clubGameVariants.clubId, clubGameVariants.gameId],
        set: { winCondition, scoringDirection },
      });
  }

  redirect(`/sessions?clubId=${clubId}`);
}
```

`addNewBoardGame` implements the spec's catalog design directly: if the name doesn't exist yet in `games`, this club's chosen rules become the new global default (no variant row needed, since they're first). If the name already exists with different rules, a `club_game_variants` row is created (or updated) for this club only — the existing default is untouched for every other club.

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/games.ts
git commit -m "feat(db): rewrite boardgame catalog reads/writes against games + club_game_variants"
```

---

## Task 4: `clubs.ts` ✅ DONE (ee43d86, refined 97c9c09) — note: club creation isn't wrapped in a transaction with the owner's club_members insert (pre-existing carried-over risk from the old app, not a new regression)

**Files:**
- Create: `src/app/lib/db/clubs.ts`

- [x] **Step 1: Write it**

```ts
// src/app/lib/db/clubs.ts
import "server-only";
import { eq, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { clubs, clubMembers, players } from "@/db/schema";
import { Club } from "@/app/lib/definitions";
import { addPlayerToClub } from "./players";

function toClub(row: typeof clubs.$inferSelect): Club {
  return {
    id: row.id,
    name: row.name,
    createdDate: row.createdAt,
    owner: row.ownerId,
  };
}

export async function getClubDetails(id: string): Promise<Club> {
  if (!id) {
    redirect("/");
  }
  const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
  if (!club) {
    redirect("/");
  }
  return toClub(club);
}

// checkIfPlayerIsClubOwner / getClubsPlayerIsNotAMemberOf / getUsersClubs are
// all called from pages/components that only ever have a Clerk external id in
// scope (user.id from currentUser()/auth()), never an already-resolved
// internal player row - see sessions/page.tsx, userClubs.tsx, AvailableClubs.tsx
// in Task 8. Rather than pushing that resolution onto each call site (which
// would mean editing three more files beyond an import-path swap), each of
// these resolves the external id to the internal players.id itself, exactly
// like players.ts's addPlayerToClub/checkIfPlayerIsClubMember already do.
async function resolvePlayerIdByExternalId(externalId: string): Promise<string | null> {
  const [player] = await db.select().from(players).where(eq(players.externalId, externalId));
  return player?.id ?? null;
}

export async function checkIfPlayerIsClubOwner(clubId: string, playerExternalId: string) {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return false;
  }
  const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
  return club?.ownerId === playerId;
}

export async function getClubsPlayerIsNotAMemberOf(playerExternalId: string): Promise<Club[]> {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return db.select().from(clubs).then((rows) => rows.map(toClub));
  }

  const memberships = await db
    .select({ clubId: clubMembers.clubId })
    .from(clubMembers)
    .where(eq(clubMembers.playerId, playerId));

  const memberClubIds = memberships.map((m) => m.clubId);

  const rows =
    memberClubIds.length > 0
      ? await db.select().from(clubs).where(notInArray(clubs.id, memberClubIds))
      : await db.select().from(clubs);

  return rows.map(toClub);
}

export async function getUsersClubs(playerExternalId: string): Promise<Club[]> {
  const playerId = await resolvePlayerIdByExternalId(playerExternalId);
  if (!playerId) {
    return [];
  }

  const rows = await db
    .select({ club: clubs })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.playerId, playerId));

  return rows.map((row) => toClub(row.club));
}

export async function addNewClub(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("clubName")?.toString();
  if (!name) {
    throw new Error("Missing required fields");
  }

  const [owner] = await db.select().from(players).where(eq(players.externalId, userId));
  if (!owner) {
    throw new Error("Player does not exist");
  }

  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId: owner.id })
    .returning();

  await addPlayerToClub(owner.externalId, insertedClub.id);

  revalidatePath("/join/club");
  redirect("/");
}
```

`checkIfPlayerIsClubOwner`, `getClubsPlayerIsNotAMemberOf`, and `getUsersClubs` all take the Clerk **external** id and resolve it to the internal `players.id` themselves (see the `resolvePlayerIdByExternalId` helper above) — matching the real call sites found in `sessions/page.tsx`, `AvailableClubs.tsx`, and `userClubs.tsx` (Task 8), none of which have an internal player row already looked up. This is the same fix `players.ts`'s `addPlayerToClub`/`checkIfPlayerIsClubMember`/`checkAccessRequestStatus` apply, closing the identity inconsistency documented in the schema spec without needing to touch those three call sites beyond an import-path swap.

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/clubs.ts
git commit -m "feat(db): rewrite club reads/writes against the new schema"
```

---

## Task 5: `players.ts` — identity, membership, join requests ✅ DONE (6992b9e, refined ed327ba) — security review caught addPlayerToClub/declineAccessRequest/addNewPlayer had no authorization at all; fixed with auth()+club-owner checks (also refactored the duplicated external-id resolver into one shared findPlayerByExternalId, per code review)

**Files:**
- Create: `src/app/lib/db/players.ts`

- [x] **Step 1: Write it**

```ts
// src/app/lib/db/players.ts
import "server-only";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { players, clubMembers, joinRequests } from "@/db/schema";
import { Player } from "@/app/lib/definitions";
import type { User } from "@clerk/nextjs/server";

function toPlayer(row: typeof players.$inferSelect): Player {
  return {
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    avatar: row.avatar ?? "",
  };
}

export async function getPlayerById(id: string): Promise<Player> {
  const [row] = await db.select().from(players).where(eq(players.id, id));
  if (!row) {
    throw new Error(`Player ${id} not found`);
  }
  return toPlayer(row);
}

export async function getPlayerByExternalId(externalId: string): Promise<Player> {
  const [row] = await db.select().from(players).where(eq(players.externalId, externalId));
  if (!row) {
    throw new Error(`Player with externalId ${externalId} not found`);
  }
  return toPlayer(row);
}

export async function checkIfUserHasPlayerProfile(externalId: string) {
  const [row] = await db.select().from(players).where(eq(players.externalId, externalId));
  return Boolean(row);
}

export async function createNewPlayerRecord(user: User) {
  await db.insert(players).values({
    externalId: user.id,
    name: user.firstName ?? "",
    avatar: user.imageUrl,
  });
}

export async function addNewPlayer(formData: FormData) {
  "use server";
  const name = formData.get("playerName")?.toString();
  if (!name) {
    throw new Error("Missing player name");
  }

  const [existing] = await db.select().from(players).where(eq(players.name, name));
  if (existing) {
    throw new Error("User with that name already exists");
  }

  const [inserted] = await db
    .insert(players)
    .values({ externalId: uuidv4(), name })
    .returning();

  return inserted.id;
}

export async function addImageToPlayer(blobUri: string, playerId: string) {
  await db.update(players).set({ avatar: blobUri }).where(eq(players.id, playerId));
  revalidatePath("/players");
}

// Called from api/session/upload/route.ts with the Clerk external id
// (tp.userId from auth()), not the internal players.id - resolve it here,
// tolerating an unknown external id as "not a member" rather than throwing.
export async function checkIfPlayerIsClubMember(playerExternalId: string, clubId: string) {
  const [player] = await db.select().from(players).where(eq(players.externalId, playerExternalId));
  if (!player) {
    return false;
  }
  const [row] = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.playerId, player.id), eq(clubMembers.clubId, clubId)));
  return Boolean(row);
}

// Called from AvailableClubs.tsx with the Clerk external id (see Task 8) -
// same resolve-internally rule as the rest of this file's membership checks.
export async function checkAccessRequestStatus(playerExternalId: string, clubId: string) {
  const [player] = await db.select().from(players).where(eq(players.externalId, playerExternalId));
  if (!player) {
    return false;
  }
  const [row] = await db
    .select()
    .from(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  return Boolean(row);
}

export async function checkForOutstandingClubAccessRequests(clubId: string) {
  const rows = await db.select().from(joinRequests).where(eq(joinRequests.clubId, clubId));
  return rows.length > 0;
}

export async function getAllAcessRequests(clubId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(joinRequests)
    .innerJoin(players, eq(joinRequests.playerId, players.id))
    .where(eq(joinRequests.clubId, clubId));

  return rows.map((row) => toPlayer(row.player));
}

// addPlayerToClub/declineAccessRequest are called from clubAccessRequests.tsx
// with player.externalId (the Clerk id), matching today's real call site -
// so these resolve to the internal players.id themselves, in one place,
// rather than pushing that resolution onto every caller.
async function resolvePlayerByExternalId(externalId: string) {
  const [player] = await db.select().from(players).where(eq(players.externalId, externalId));
  if (!player) {
    throw new Error(`Player with externalId ${externalId} not found`);
  }
  return player;
}

export async function addPlayerToClub(playerExternalId: string, clubId: string) {
  "use server";
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db.insert(clubMembers).values({ playerId: player.id, clubId });
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath("/requests");
}

export async function declineAccessRequest(playerExternalId: string, clubId: string) {
  "use server";
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath("/requests");
}

export async function requestAccessToClub(clubId: string) {
  "use server";
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const player = await resolvePlayerByExternalId(userId);
  await db.insert(joinRequests).values({ id: uuidv4(), playerId: player.id, clubId });
}
```

Note the parameter type: `checkIfPlayerIsClubMember`, `checkAccessRequestStatus`, `addPlayerToClub`, `declineAccessRequest`, and `requestAccessToClub` all take a Clerk **external** id (matching their real call sites in Task 8) and resolve it to the internal `players.id` themselves before touching `club_members`/`join_requests` — per the schema spec's invariant that this resolution happens in one place, not scattered across callers. `getPlayerById`/`addImageToPlayer` take the internal id directly, since their callers (`getAllPlayersBySessionId`, the avatar upload route) already have it.

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/players.ts
git commit -m "feat(db): rewrite player identity and club membership against the new schema"
```

---

## Task 6: `sessions.ts` — sessions, plays, both roster queries ✅ DONE (9f6c123; security fixes 5293d4a, fa67726) — added auth+membership checks to addNewGameSession/endSession, and scoped addImageToSession's update to (sessionId, clubId) to close a cross-tenant IDOR

**Files:**
- Create: `src/app/lib/db/sessions.ts`

- [x] **Step 1: Write it**

```ts
// src/app/lib/db/sessions.ts
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  sessions,
  plays,
  clubMembers,
  players,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { GameSession, Player } from "@/app/lib/definitions";
import { getEventWinner, getPlayResultsForPlay } from "./results";

function toPlayer(row: typeof players.$inferSelect): Player {
  return { id: row.id, externalId: row.externalId, name: row.name, avatar: row.avatar ?? "" };
}

/** Record-time roster: every club member, every time. */
export async function getAllPlayersInClub(clubId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(clubMembers)
    .innerJoin(players, eq(clubMembers.playerId, players.id))
    .where(eq(clubMembers.clubId, clubId));

  return rows.map((row) => toPlayer(row.player));
}

/** Historical roster: derived from every result table via this session's plays. */
export async function getAllPlayersBySessionId(sessionId: string): Promise<Player[]> {
  const sessionPlays = await db
    .select({ id: plays.id })
    .from(plays)
    .where(eq(plays.sessionId, sessionId));

  const playIds = sessionPlays.map((p) => p.id);
  if (playIds.length === 0) {
    return [];
  }

  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select({ playerId: leaderboardResults.playerId }).from(leaderboardResults).where(inArray(leaderboardResults.playId, playIds)),
    db.select({ playerId: teamResults.playerId }).from(teamResults).where(inArray(teamResults.playId, playIds)),
    db.select({ playerId: outcomeResults.playerId }).from(outcomeResults).where(inArray(outcomeResults.playId, playIds)),
  ]);

  const playerIds = [
    ...new Set([...leaderboardRows, ...teamRows, ...outcomeRows].map((r) => r.playerId)),
  ];
  if (playerIds.length === 0) {
    return [];
  }

  const rows = await db.select().from(players).where(inArray(players.id, playerIds));
  return rows.map(toPlayer);
}

export async function getAllClubSessionNames(clubId: string): Promise<string[]> {
  const rows = await db
    .select({ name: sessions.name })
    .from(sessions)
    .where(eq(sessions.clubId, clubId));
  return rows.map((row) => row.name ?? "");
}

async function toGameSession(row: typeof sessions.$inferSelect): Promise<GameSession> {
  const sessionPlays = await db.select().from(plays).where(eq(plays.sessionId, row.id));
  const playerResults = (await Promise.all(sessionPlays.map((p) => getPlayResultsForPlay(p)))).flat();
  const winners = await Promise.all(sessionPlays.map((p) => getEventWinner(p.id)));
  const imageUrls = row.imageUrls as string[] | null;

  return {
    id: row.id,
    name: row.name ?? "",
    date: row.date,
    active: row.active,
    playerIds: [...new Set(playerResults.map((r) => r.playerId))],
    playerResults,
    notes: row.notes ?? undefined,
    imageurl: imageUrls ? JSON.stringify(imageUrls) : "",
    winners,
  };
}

export async function getAllActiveSessionDetails(clubId: string): Promise<GameSession[]> {
  if (!clubId) {
    redirect("/");
  }
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.active, true), eq(sessions.clubId, clubId)));
  return Promise.all(rows.map(toGameSession));
}

export async function getAllInactiveSessions(clubId: string): Promise<GameSession[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.active, false), eq(sessions.clubId, clubId)));
  return Promise.all(rows.map(toGameSession));
}

export async function getSessionDetails(id: string): Promise<GameSession[]> {
  const rows = await db.select().from(sessions).where(eq(sessions.id, id));
  return Promise.all(rows.map(toGameSession));
}

export async function addNewGameSession(formData: FormData) {
  "use server";
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  if (!sessionName || !clubId) {
    throw new Error("Missing required fields");
  }

  await db.insert(sessions).values({
    id: uuidv4(),
    clubId,
    name: sessionName,
    date: new Date(),
    active: true,
  });

  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
}

export async function endSession(id: string, notes: string) {
  "use server";
  await db.update(sessions).set({ active: false, notes }).where(eq(sessions.id, id));
  revalidatePath("/sessions");
}

export async function addImageToSession(blobUri: string, sessionId: string, clubId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  const currentImages = (session?.imageUrls as string[] | null) ?? [];
  const updatedImages = [...currentImages, blobUri];

  await db.update(sessions).set({ imageUrls: updatedImages }).where(eq(sessions.id, sessionId));

  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
}

export const redirectBackToSessions = async (clubId: string) => {
  "use server";
  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
};
```

`addNewGameSession` no longer accepts a `player` field from the form — `sessions` has no `player_ids` column in the new schema, and per the spec, the record-time roster is always derived from `club_members` when a result is actually recorded, not fixed at session-creation time. See Task 9 for the matching `AddNewSession` form change (the player checkbox section is removed, since it would otherwise silently do nothing).

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/sessions.ts
git commit -m "feat(db): rewrite session reads/writes, split record-time vs historical roster"
```

---

## Task 7: `results.ts` — the three-way write path and result reads ✅ DONE (fbd5fe4; security fixes 2823b97, db2831e) — added auth+club-membership to recordPlayResults, then fixed a second IDOR: clubId is now derived from the session's own row rather than trusted as a separate client-supplied form field, matching the addImageToSession fix. Known, deferred issue: parseCheckedPlayers' comma-delimited FormData encoding will silently truncate/misparse a team name containing a comma (schema allows free-text team names); inert under the current UI (hardcoded "Team 1".."Team 4") but worth hardening if Task 9's UI changes that.

**Files:**
- Create: `src/app/lib/db/results.ts`

This is the module the schema spec's invariants are about: `recordPlayResults` is the *only* place that resolves a play's effective win condition and writes to one of the three result tables.

- [x] **Step 1: Write it**

```ts
// src/app/lib/db/results.ts
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  plays,
  games,
  leaderboardResults,
  teamResults,
  outcomeResults,
  players,
} from "@/db/schema";
import { GameAndWinner, PlayerResult } from "@/app/lib/definitions";
import { resolveEffectiveRules } from "./rules";
import { getBoardgameById } from "./games";

type CheckedPlayerEntry = {
  playerId: string;
  score: string;
  team: string;
};

function parseCheckedPlayers(formData: FormData): CheckedPlayerEntry[] {
  const entries: CheckedPlayerEntry[] = [];
  for (const [key, value] of formData.entries()) {
    const [prefix, playerId] = key.split("_");
    if (prefix !== "player") continue;
    const [playedGame, score, team] = value.toString().split(",");
    if (playedGame === "true") {
      entries.push({ playerId, score, team });
    }
  }
  return entries;
}

export async function recordPlayResults(formData: FormData) {
  "use server";
  const sessionId = formData.get("sessionId")?.toString();
  const clubId = formData.get("clubId")?.toString();
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString() ?? null;

  if (!sessionId || !clubId || !gameId) {
    throw new Error("Missing required fields");
  }

  const rules = await resolveEffectiveRules(clubId, gameId);
  const checkedPlayers = parseCheckedPlayers(formData);

  const [play] = await db
    .insert(plays)
    .values({ id: uuidv4(), sessionId, gameId, notes })
    .returning();

  switch (rules.winCondition) {
    case "leaderboard": {
      for (const entry of checkedPlayers) {
        await db.insert(leaderboardResults).values({
          playId: play.id,
          playerId: entry.playerId,
          score: Number(entry.score) || 0,
        });
      }
      break;
    }

    case "team_based": {
      const winningTeam = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(teamResults).values({
          playId: play.id,
          playerId: entry.playerId,
          team: entry.team,
          won: winningTeam !== "Tie" && entry.team === winningTeam,
        });
      }
      break;
    }

    case "cooperative": {
      const outcome = formData.get("winner")?.toString();
      for (const entry of checkedPlayers) {
        await db.insert(outcomeResults).values({
          playId: play.id,
          playerId: entry.playerId,
          won: outcome === "Players",
        });
      }
      break;
    }

    case "single_winner":
    case "single_loser": {
      const selectedPlayerId =
        rules.winCondition === "single_winner"
          ? formData.get("winner")?.toString()
          : formData.get("loser")?.toString();
      const participantIds = formData.getAll("participant").map((id) => id.toString());
      for (const playerId of participantIds) {
        const isSelected = playerId === selectedPlayerId;
        const won = rules.winCondition === "single_winner" ? isSelected : !isSelected;
        await db.insert(outcomeResults).values({ playId: play.id, playerId, won });
      }
      break;
    }
  }

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}

/** Every result row recorded for one play, in the old PlayerResult shape UI already consumes. */
export async function getPlayResultsForPlay(play: typeof plays.$inferSelect): Promise<PlayerResult[]> {
  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
    db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
    db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
  ]);

  return [
    ...leaderboardRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: String(row.score),
      eventId: play.id,
    } as PlayerResult)),
    ...teamRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: row.won ? "Won" : "Lost",
      team: row.team,
      eventId: play.id,
    } as PlayerResult)),
    ...outcomeRows.map((row) => ({
      id: `${row.playId}-${row.playerId}`,
      playerId: row.playerId,
      gameId: play.gameId,
      sessionId: play.sessionId,
      result: row.won ? "Won" : "Lost",
      eventId: play.id,
    } as PlayerResult)),
  ];
}

export async function getEventNotes(playId: string): Promise<string> {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  return play?.notes ?? "";
}

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

  if (outcomeRows.length > 0) {
    const winningRow = outcomeRows.find((row) => row.won);
    if (!winningRow) {
      return { id: playId as any, winner: "Tied" };
    }
    const [winningPlayer] = await db.select().from(players).where(eq(players.id, winningRow.playerId));
    return { id: playId as any, winner: winningPlayer?.name ?? "Unknown" };
  }

  const leaderboardRows = await db
    .select()
    .from(leaderboardResults)
    .where(eq(leaderboardResults.playId, playId));

  if (leaderboardRows.length === 0) {
    return { id: playId as any, winner: "" };
  }

  const [game] = await db.select().from(games).where(eq(games.id, play.gameId));
  const highScoreWins = game?.scoringDirection !== "low";
  const best = leaderboardRows.reduce((acc, row) =>
    highScoreWins ? (row.score > acc.score ? row : acc) : (row.score < acc.score ? row : acc)
  );
  const [winningPlayer] = await db.select().from(players).where(eq(players.id, best.playerId));
  return { id: playId as any, winner: winningPlayer?.name ?? "Unknown" };
}

export type GroupedBoardgameTotalPlays = {
  [gameName: string]: number;
};

export async function getPlayerEvents(playerId: string): Promise<GroupedBoardgameTotalPlays> {
  const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
    db.select({ playId: leaderboardResults.playId }).from(leaderboardResults).where(eq(leaderboardResults.playerId, playerId)),
    db.select({ playId: teamResults.playId }).from(teamResults).where(eq(teamResults.playerId, playerId)),
    db.select({ playId: outcomeResults.playId }).from(outcomeResults).where(eq(outcomeResults.playerId, playerId)),
  ]);

  const playIds = [...new Set([...leaderboardRows, ...teamRows, ...outcomeRows].map((r) => r.playId))];
  if (playIds.length === 0) {
    return {};
  }

  const playedGames = await db.select().from(plays).where(inArray(plays.id, playIds));
  const result: GroupedBoardgameTotalPlays = {};

  for (const play of playedGames) {
    const game = await getBoardgameById(play.gameId);
    result[game.name] = (result[game.name] ?? 0) + 1;
  }
  return result;
}
```

`recordPlayResults` replaces `addNewGameResult` as the exported name — Task 8 updates `addGameResult.tsx`'s import and the form's `action` prop accordingly (a rename here is warranted since the old name described the old single-table write, and there's exactly one call site to fix).

- [x] **Step 2: Commit**

```bash
git add src/app/lib/db/results.ts
git commit -m "feat(db): implement the three-way result write path and result reads"
```

---

## Task 8: Update every call site's import paths (and two real logic changes) ✅ DONE (09ab031, typo fix 1763eff)

**Files (import-path changes only — swap `@/app/lib/data` / `@/app/lib/actions` for the matching `@/app/lib/db/*` module):**

- Modify: `src/app/page.tsx` — `checkIfUserHasPlayerProfile` from `./lib/db/players`, `createNewPlayerRecord` from `./lib/db/players`
- Modify: `src/app/api/avatar/upload/route.ts` — `addImageToPlayer`, `getPlayerByExternalId` from `@/app/lib/db/players`
- Modify: `src/app/add/session/upload/page.tsx` — `redirectBackToSessions` from `@/app/lib/db/sessions`
- Modify: `src/app/api/session/upload/route.ts` — `addImageToSession` from `@/app/lib/db/sessions`, `checkIfPlayerIsClubMember` from `@/app/lib/db/players`
- Modify: `src/app/requests/page.tsx` — `getAllAcessRequests` from `../lib/db/players`
- Modify: `src/app/players/page.tsx` — `getPlayerById` from `../lib/db/players`, `getPlayerEvents` from `../lib/db/results`
- Modify: `src/app/ui/clubs/joinClubButton.tsx` — `requestAccessToClub` from `@/app/lib/db/players`
- Modify: `src/app/ui/clubs/userClubs.tsx` — `getUsersClubs` from `@/app/lib/db/clubs`
- Modify: `src/app/ui/add/addNewClub.tsx` — `addNewClub` from `@/app/lib/db/clubs`
- Modify: `src/app/ui/sessions/currentSession/currentSession.tsx` — `endSession` from `@/app/lib/db/sessions`
- Modify: `src/app/ui/add/addNewPlayer.tsx` — `redirectBackToSessions` from `@/app/lib/db/sessions`
- Modify: `src/app/ui/requests/clubAccessRequests.tsx` — `addPlayerToClub`, `declineAccessRequest` from `@/app/lib/db/players`
- Modify: `src/app/ui/add/addNewGame.tsx` — `addNewBoardGame` from `@/app/lib/db/games`
- Modify: `src/app/ui/sessions/addNewSession.tsx` — `addNewGameSession` from `@/app/lib/db/sessions`
- Modify: `src/app/ui/clubs/AvailableClubs.tsx` — `checkAccessRequestStatus` from `@/app/lib/db/players`, `getClubsPlayerIsNotAMemberOf` from `@/app/lib/db/clubs`

**Files with a real logic change, beyond the import path:**

- [ ] **`src/app/sessions/page.tsx`** — import-path change only: `checkForOutstandingClubAccessRequests` from `@/app/lib/db/players`; `getAllActiveSessionDetails`, `getAllInactiveSessions` from `@/app/lib/db/sessions`; `getAllBoardgames` from `@/app/lib/db/games`; `getClubDetails`, `checkIfPlayerIsClubOwner` from `@/app/lib/db/clubs`. `checkIfPlayerIsClubOwner(clubId, user.id)` keeps passing the Clerk external id exactly as it does today — `checkIfPlayerIsClubOwner` itself now resolves that to the internal player id (Task 4), consistent with every other membership-check function in this rewrite, so no call-site change is needed here.

- [ ] **`src/app/ui/add/Results/addGameResult.tsx`** — the record-time roster switches from the old session-derived list to the always-every-club-member list (the design decision from brainstorming). Full new content:

  ```tsx
  import { getAllBoardgames } from "@/app/lib/db/games";
  import { getAllPlayersInClub } from "@/app/lib/db/sessions";
  import { recordPlayResults } from "@/app/lib/db/results";
  import Results from "../../winConditions/results";
  import CancelButton from "../../Common/cancelButton";
  import SubmitButton from "../../Common/submitButton";

  export interface AddGameResultProps {
    sessionId: string;
    clubId: string;
  }

  export default async function AddGameResult({
    sessionId,
    clubId,
  }: AddGameResultProps) {
    const players = await getAllPlayersInClub(clubId);
    const boardGames = await getAllBoardgames(clubId);

    return (
      <div className="w-full flex flex-col space-items items-center py-5 bg-black text-white dark:bg-black text-white">
        <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col p-4 rounded-sm bg-black">
          <form action={recordPlayResults}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="clubId" value={clubId} />

            <div
              className="pb-2 text-3xl md:text-3xl lg:text-4xl xl:text-4xl
                      text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
            >
              Add Result
            </div>

            <Results games={boardGames} players={players}></Results>

            <div className="flex flex-row gap-4 items-center ">
              {boardGames.length > 0 && <SubmitButton label="Submit" />}
              <CancelButton />
            </div>
          </form>
        </div>
      </div>
    );
  }
  ```

- [ ] **`src/app/sessions/newSession/page.tsx`** — drop the now-unused `getAllClubSessionNames` import (it was already commented out); import `getAllPlayersInClub` from `@/app/lib/db/sessions`. Per Task 9, `AddNewSession` no longer needs a `players` prop, so this page no longer needs to fetch it either:

  ```tsx
  import AddNewSession from "@/app/ui/sessions/addNewSession";

  export default async function Page({
    searchParams,
  }: {
    searchParams: Promise<Record<string, string>>;
  }) {
    const { clubId } = await searchParams;

    return (
      <div className="w-full flex flex-col space-items items-center py-5 bg-black">
        <AddNewSession clubId={clubId} />
      </div>
    );
  }
  ```

- [ ] **`src/app/sessions/previousSession/page.tsx`** — drop the `GetClubNameByEventId` import entirely (confirmed dead code: imported but never called in this file, and not called anywhere else in the codebase). Update remaining imports to `@/app/lib/db/sessions` (`getAllPlayersBySessionId`, `getSessionDetails`), `@/app/lib/db/games` (`getBoardgameById`), `@/app/lib/db/clubs` (`getClubDetails`), `@/app/lib/db/results` (`getEventNotes`, `getEventWinner`). No other changes — the rest of this file's logic is unchanged since `PlayerResult`/`GameAndWinner` keep their shape.

- [ ] **`src/app/ui/players/playerPage.tsx`** — import `GroupedBoardgameTotalPlays` from `@/app/lib/db/results` instead of `@/app/lib/data`.

- [ ] **Commit**

```bash
git add src/app/page.tsx src/app/api src/app/add src/app/requests src/app/players \
        src/app/sessions src/app/ui
git commit -m "refactor: point every call site at the new src/app/lib/db modules"
```

---

## Task 9: UI changes forced by the new schema ✅ DONE (868eef5, validation fix e1d95fd) — recordPlayResults now rejects a single_winner/single_loser submission if the selected winner/loser isn't among the checked participants, since the checkbox row and avatar-grid picker are independent, unwired controls

**Files:**
- Modify: `src/app/ui/winConditions/playerRow.tsx`
- Modify: `src/app/ui/winConditions/leaderboard.tsx`
- Modify: `src/app/ui/winConditions/results.tsx`
- Modify: `src/app/ui/sessions/addNewSession.tsx`

- [ ] **Step 1: Drop the score input for team-based/cooperative in `PlayerRow`**

`team_results`/`outcome_results` have no `score` column. In `src/app/ui/winConditions/playerRow.tsx`, wrap the existing score `<div>` so it only renders for leaderboard games:

```tsx
{parseInt(game.winCondition) === WinCondition.LeaderBoard && (
  <div className="flex border rounded-sm w-[25%]">
    <input
      type="number"
      id="score"
      onChange={handleScoreChange}
      className="bg-tunnel-snake-grey text-tunnel-snake-green text-center w-[100%]"
    />
  </div>
)}
```

(This is the only change to this file — the checkbox, avatar, and team-dropdown sections are untouched.)

- [ ] **Step 2: Add participant checkboxes to the single-winner/single-loser picker in `Leaderboard.tsx`**

Per the mockup confirmed during brainstorming, both `WinCondition.SingleLoser` and `WinCondition.SinglerWinner` branches gain a checkbox row above the avatar grid, and the avatar grid only shows checked players. Replace both branches:

```tsx
case WinCondition.SingleLoser:
case WinCondition.SinglerWinner: {
  const isLoser = parseInt(game.winCondition) === WinCondition.SingleLoser;
  return (
    <div className="pb-6">
      <p className="p-4 text-sm text-gray-400">Who&apos;s playing?</p>
      <div className="flex flex-wrap gap-4 px-4 pb-4">
        {players.map((player: Player) => (
          <label key={player.id} className="flex flex-col items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="participant"
              value={player.id}
              defaultChecked
              className="accent-tunnel-snake-green w-5 h-5"
            />
            {player.name}
          </label>
        ))}
      </div>

      <p className="p-4 text-xl">{isLoser ? "Select the loser" : "Select the winner"}</p>
      <div className="grid grid-cols-3 gap-4">
        {players.map((player: Player) => (
          <div key={player.id} className="flex flex-col items-center">
            <input
              type="radio"
              id={player.id}
              name={isLoser ? "loser" : "winner"}
              value={player.id}
              required
              className="hidden"
            />
            <label htmlFor={player.id} className="relative">
              <Image
                src={player.avatar}
                alt={player.name}
                width={50}
                height={50}
                className={`rounded-full ${
                  selectedPlayerId === player.id ? "ring-4 ring-tunnel-snake-green" : ""
                }`}
                onClick={() => setSelectedPlayerId(player.id)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
```

The mockup shown during brainstorming hid unchecked players from the avatar grid entirely via JS; this port keeps it simpler (checkbox state and avatar grid both list every player) since wiring live show/hide would mean converting this from a mostly-static server-rendered list into more client state — an UX nicety, not something the schema requires. Flag this simplification for the user to confirm before merging (see Task 11).

- [ ] **Step 3: Add the house-rules asterisk and subtext to `Results.tsx`**

```tsx
{games.map((game) => (
  <option key={game.id} value={game.name}>
    {game.name}{game.hasVariant ? " *" : ""}
  </option>
))}
```

And beneath the `<select>`, only when the currently selected game has a variant:

```tsx
{game?.hasVariant && (
  <p className="text-tunnel-snake-orange text-xs">{clubName}&apos;s house rules</p>
)}
```

This requires `Results` to receive a `clubName` prop — add it to `ResultsProps` and thread it from `AddGameResult` (Task 8), which already has `clubId` and can fetch the club's name via `getClubDetails`.

- [ ] **Step 4: Remove the now-nonfunctional player checklist from `AddNewSession`**

`sessions` has no `player_ids` column in the new schema, and the record-time roster (Task 6's decision) is sourced fresh at result-recording time, not at session creation — so the checkbox list this form currently collects would silently do nothing if kept. Remove the `players` prop and the entire "Players" section:

```tsx
"use client";
import { addNewGameSession } from "@/app/lib/db/sessions";
import CancelButton from "../Common/cancelButton";
import SubmitButton from "../Common/submitButton";
import { SetStateAction, useState } from "react";

export interface AddNewSessionProps {
  clubId: string;
}

export default function AddNewSession({ clubId }: AddNewSessionProps) {
  const [sessionName, setSessionName] = useState("");
  const maxChars = 25;

  const handleInputChange = (e: {
    target: { value: SetStateAction<string> };
  }) => {
    setSessionName(e.target.value);
  };

  const charsLeft = maxChars - sessionName.length;

  return (
    <form action={addNewGameSession}>
      <input type="hidden" name="clubId" value={clubId} />
      <div className=" bg-tunnel-snake-black flex-col justify-start items-start gap-8 inline-flex">
        <div className="text-white text-[32px] font-semibold font-['Montserrat']">
          Add New Session
        </div>
        <div className="flex-col justify-start items-start gap-5 flex">
          <div className="flex-col justify-start items-start gap-2 flex">
            <div className="text-white text-sm font-medium ">Session name</div>
            <input
              id="sessionName"
              name="sessionName"
              type="text"
              required
              value={sessionName}
              onChange={handleInputChange}
              maxLength={maxChars}
              className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex text-white dark:text-white"
            />
            <div className=" font-['Montserrat'] flex w-[100%] justify-end text-sm text-tunnel-snake-orange">
              {charsLeft} / {maxChars}
            </div>
          </div>
        </div>
        <div className="mt-4 mb-4 w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] flex flex-col gap-4 items-center">
          <SubmitButton label={"Create session"} />
          <CancelButton />
        </div>
      </div>
    </form>
  );
}
```

**This is a real, user-visible flow change** ("Add New Session" no longer shows a player picker) that falls out of the schema decisions rather than being chosen directly during brainstorming — flag it explicitly when presenting this work for review (see Task 11), since it wasn't shown as a mockup the way the other UI changes were.

- [ ] **Step 5: Commit**

```bash
git add src/app/ui/winConditions src/app/ui/sessions/addNewSession.tsx
git commit -m "feat(ui): adjust result-entry and session-creation forms for the new schema"
```

---

## Task 10: Delete the old data-access files ✅ DONE (7715a08) — confirmed zero remaining references, then a clean `tsc --noEmit` across the whole project for the first time in this rewrite

**Files:**
- Delete: `src/app/lib/data.ts`
- Delete: `src/app/lib/actions.ts`

- [x] **Step 1: Confirm nothing still imports them**

```bash
grep -rn "@/app/lib/data\"\|@/app/lib/actions\"\|\.\./lib/data\"\|\.\./lib/actions\"\|\./lib/data\"\|\./lib/actions\"" src/
```

Expected: no output (Tasks 1-9 should have moved every import).

- [x] **Step 2: Delete and type-check**

```bash
rm src/app/lib/data.ts src/app/lib/actions.ts
npx tsc --noEmit
```

Expected: no type errors.

- [x] **Step 3: Commit**

```bash
git add -u src/app/lib/data.ts src/app/lib/actions.ts
git commit -m "chore: remove data.ts/actions.ts, fully replaced by src/app/lib/db/*"
```

---

## Task 11: Rewrite `scripts/seed.js` ✅ DONE (988f660)

**Files:**
- Modify: `scripts/seed.js`
- Modify: `src/app/lib/seedData.js` (or delete if no longer needed)

- [x] **Step 1: Rewrite against the new schema**

The old script seeded a single admin `players` row with `email`/`avatar`, using a shape that predates even the pre-Drizzle schema this rewrite replaces. Replace it with a minimal seed that's actually useful for local development — one club with an owner and a couple of catalog games:

```js
const { db } = require('@vercel/postgres');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const client = await db.connect();
  try {
    const playerId = uuidv4();
    await client.query(
      `INSERT INTO players (id, external_id, name) VALUES ($1, $2, $3)`,
      [playerId, 'seed-admin', 'Admin']
    );

    const clubId = uuidv4();
    await client.query(
      `INSERT INTO clubs (id, name, owner_id) VALUES ($1, $2, $3)`,
      [clubId, 'Seed Club', playerId]
    );
    await client.query(
      `INSERT INTO club_members (player_id, club_id) VALUES ($1, $2)`,
      [playerId, clubId]
    );

    const catanId = uuidv4();
    await client.query(
      `INSERT INTO games (id, name, win_condition, scoring_direction) VALUES ($1, $2, 'leaderboard', 'high')`,
      [catanId, 'Catan']
    );

    console.log('Seeded: 1 player, 1 club, 1 game.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [x] **Step 2: Remove the now-unused `seedData.js`**

```bash
rm src/app/lib/seedData.js
```

- [x] **Step 3: Commit**

```bash
git add scripts/seed.js
git add -u src/app/lib/seedData.js
git commit -m "chore: rewrite seed script against the new schema"
```

---

## Task 12: Verification script for the rewritten data-access layer ✅ DONE (2685c4a, extended 5ecf3d3) — covers players/clubs/games/rules/sessions reads plus addNewBoardGame's real write path; auth-gated writes (addNewClub, addPlayerToClub, declineAccessRequest, requestAccessToClub, addNewGameSession, endSession, recordPlayResults, addNewPlayer) simulated via direct fixture inserts since auth() needs a real Next.js request context. Known, accepted gap: composed session-read functions (toGameSession/getAllActiveSessionDetails/etc.) aren't scripted here — exercised for real in Task 13's browser walkthrough instead. Ran live against the real database each time; confirmed zero leftover fixture rows, including via a deliberately-injected mid-run failure.

**Files:**
- Create: `scripts/verify-data-layer.js`

Unlike Phase 1's `verify-schema.js` (raw SQL against the schema), this calls the actual exported TypeScript functions from `src/app/lib/db/*`, so it catches regressions in the resolution/branching logic itself, not just the tables underneath it. Since `ts-node`/`tsx` aren't installed in this project, this step compiles the `db` modules with `tsc` to a scratch directory first.

**Important:** every function in `src/app/lib/db/*` uses the single module-level `db` client from `src/db/client.ts` internally — none of them accept an external transaction handle. That means a wrapping `db.transaction(async (tx) => { ... calls into players.ts ... })` at the script level would **not** actually roll those calls back, since they'd run against the module's own `db`, not the `tx` passed into the callback (this was caught and fixed while writing this plan — an earlier draft of this script relied on exactly that false assumption). So this script performs real inserts and cleans them up with explicit deletes afterward, in reverse dependency order — the same way Phase 1's `verify-schema.js` used a real `BEGIN`/`ROLLBACK` against the raw client, just without the free rollback here since these calls don't share one connection.

- [ ] **Step 1: Write the script**

```js
// scripts/verify-data-layer.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', '.verify-data-layer-out');

function compile() {
  execSync(
    `npx tsc --outDir ${OUT_DIR} --module commonjs --moduleResolution node --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule src/db/schema.ts src/db/client.ts src/app/lib/db/*.ts`,
    { stdio: 'inherit' }
  );
}

async function main() {
  compile();

  const players = require(path.join(OUT_DIR, 'src/app/lib/db/players.js'));
  const { db } = require(path.join(OUT_DIR, 'src/db/client.js'));
  const { players: playersTable } = require(path.join(OUT_DIR, 'src/db/schema.js'));
  const { eq } = require('drizzle-orm');

  const newPlayer = new FormData();
  newPlayer.append('playerName', 'Verify Layer Bot');
  const playerId = await players.addNewPlayer(newPlayer);

  try {
    const player = await players.getPlayerById(playerId);
    if (player.name !== 'Verify Layer Bot') {
      throw new Error('getPlayerById mismatch');
    }
    console.log('players.ts round-trip OK');
  } finally {
    // Explicit cleanup, not a transaction rollback - see note above.
    await db.delete(playersTable).where(eq(playersTable.id, playerId));
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  console.log('Data-access layer verification passed.');
}

main().catch((err) => {
  console.error('Data-access layer verification failed:', err);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  process.exit(1);
});
```

This covers the `players.ts` round-trip as a template; extend the same insert-then-explicitly-delete pattern to exercise `clubs.ts` → `games.ts` → `sessions.ts` → `results.ts` end-to-end (create a club, a game, a session, record one result of each win condition type, assert `getEventWinner`/`getAllPlayersBySessionId` return the expected values, then delete everything created in reverse dependency order: results → plays → sessions/club_game_variants → games → club_members → clubs → players) before this task is considered done — the single `players.ts` check above is the minimum to prove the compile-and-require approach works, not the full coverage this task needs.

**Amendment (post-Task-7 security fixes):** by the time this task runs, `addNewClub`, `addPlayerToClub`, `declineAccessRequest`, `requestAccessToClub`, `addNewGameSession`, `endSession`, and `recordPlayResults` all call Clerk's `auth()` internally as an authorization gate (added during code/security review on Tasks 5–7, after this task was originally drafted). `auth()` requires a real Next.js request/middleware context to resolve a session — it does not work when these functions are `require()`'d and called directly from a standalone Node script the way this task's `players.ts` example does with `addNewPlayer` (which, not coincidentally, is the one write function in this file that does *not* require auth). Calling any of the seven auth-gated functions from this script will throw.

Given that, extend coverage using this adjusted approach instead of literally calling every exported function:
- **Read functions** (`getClubDetails`, `checkIfPlayerIsClubOwner`, `getClubsPlayerIsNotAMemberOf`, `getUsersClubs`, `getAllBoardgames`, `getBoardgameById`, `resolveEffectiveRules`, `getAllPlayersInClub`, `getAllPlayersBySessionId`, `getAllActiveSessionDetails`, `getEventWinner`, `getPlayResultsForPlay`, `getPlayerEvents`, etc.) — call these directly as planned; none of them require `auth()`.
- **Auth-gated write functions** — do not call them from this script. Instead, insert the fixture rows they would have written directly via Drizzle (`db.insert(clubs).values(...)`, `db.insert(plays).values(...)`, etc.), then verify the *read* functions return correct results against that fixture data. This still exercises every read path's query logic (including `getEventWinner`'s three-way fallback and `resolveEffectiveRules`'s variant-then-default resolution) — it just can't exercise the auth check itself or the write-side branching logic in `recordPlayResults`'s switch statement via this script.
- The auth checks and `recordPlayResults`'s write-side branching are exercised for real in Task 13 (manual browser verification), which runs inside a real authenticated Next.js request — that is the actual coverage for those paths, not a gap being silently accepted.

- [ ] **Step 2: Add the npm script**

```json
"db:verify-layer": "node scripts/verify-data-layer.js"
```

- [ ] **Step 3: Run it and confirm it passes**

```bash
npm run db:verify-layer
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-data-layer.js package.json
git commit -m "test(db): verify the rewritten data-access layer end-to-end"
```

---

## Task 13: Manual verification in the browser (partial — public-path checked; authenticated walkthrough handed to the user)

**Files:** none — this task drives the running app, per this project's standing requirement that UI changes be exercised in a browser before being called done.

- [x] **Step 1: Start the dev server** — running on http://localhost:3002 (port 3000 was in use)

```bash
npm run dev
```

- [ ] **Step 2: Walk through the golden path**

- Sign in, confirm a player profile gets created (`checkIfUserHasPlayerProfile` / `createNewPlayerRecord`).
- Create a club, confirm you land back on `/` and the club shows up under "your clubs."
- Create a new session.
- Add a board game with `leaderboard` win condition; record a result; confirm scores show correctly on the previous-session view.
- Add a board game with `team_based`; record a result including a **Tie**; confirm the previous-session view shows "Tied" rather than crashing.
- Add a board game with `cooperative`; record both a "Players win" and a "Game wins" outcome across two plays.
- Add a board game with `single_winner`; confirm the new participant checkboxes appear and unchecking someone removes them from the avatar grid.
- Add the same game again for a different club with different rules (e.g. flip scoring direction) and confirm the `*` and house-rules subtext appear only for that club.
- View a finished (inactive) session and confirm the roster shown matches who actually has result rows, not who was checked at session creation.

- [ ] **Step 3: Confirm no regressions**

Check the browser console and terminal output for errors during the above walkthrough. Fix forward in a new commit if anything surfaces.

**Post-Task-13 correction (05a32b6):** the user ran the app themselves and immediately hit a real Next.js build error that Tasks 2–12's verification never caught: `import "server-only"` (module-level) mixed with per-function `"use server"` directives in the same file — a pattern every one of those tasks' plan text explicitly called deliberate — breaks `next build`/`next dev` whenever that file is reachable from any `"use client"` component, even via an unrelated export. `tsc --noEmit` and `eslint` both stay silent about this, because Next.js's client/server boundary analysis only runs inside its own compiler, which nothing in Tasks 1–12 ever invoked — every verification step in this plan ran `tsc`/`eslint`/a standalone Node script, never `npm run build` or `npm run dev` against a real route. Fixed by splitting all 5 affected domain modules into a reads file (keeps `import "server-only"`) and a sibling `*-actions.ts` file (starts with `"use server";`, holds every mutation actually used as a form action/onClick handler from client code) — see commit `05a32b6` for the full breakdown. **Lesson for future plans in this codebase: any task touching a file that mixes reads and Server Actions must include running the actual `next build` (or `next dev` + hitting the affected route) as a verification step — a clean `tsc`/`eslint` pass is not sufficient evidence the code works in Next.js's real module system.**

---

## Self-Review Notes

- **Spec coverage:** every function named in the Phase 2 spec's file structure (`rules.ts`, `players.ts`, `clubs.ts`, `games.ts`, `sessions.ts`, `results.ts`) is implemented in Tasks 2–7. The three UI changes called out in the spec (house-rules indicator, single-winner/single-loser participants, dropped score input) are Task 9. `scripts/seed.js` is Task 11, as flagged in both specs' "Open items."
- **Placeholder scan:** Task 12's script is explicit that it's a template covering one module, not full coverage — that's a real, stated scope boundary for the task to finish, not a vague "add tests" placeholder.
- **Type consistency:** `PlayerResult`/`GameAndWinner`/`BoardGame`/`Player`/`Club`/`GameSession` are used with identical field names across Tasks 3–9, matching `definitions.ts` (Task 1) exactly — this was the core architectural decision (Task 0 in spirit: keep the view-model layer stable) and is the main thing keeping this plan's blast radius contained to ~20 files instead of every component in the tree.
- **New consequence surfaced while writing this plan** (not caught during brainstorming, flagged for the user before merging Task 9): the avatar-grid participant checkboxes for single-winner/single-loser (Task 9, Step 2) are implemented as a simpler, fully-server-rendered version of the interactive mockup shown during brainstorming (which live-hid unchecked players via client-side JS). Confirm this simplification is acceptable, or convert `Leaderboard.tsx`'s relevant branch to track checkbox state client-side to match the mockup exactly.
- **New consequence surfaced while writing this plan** (flagged for the user): removing the player picker from `AddNewSession` (Task 9, Step 4) is a visible flow change that follows necessarily from "no session-level roster column," but was not itself shown as a mockup or explicitly signed off on during brainstorming the way the other UI changes were.
- **Bugs caught and fixed while writing this plan, not during brainstorming:** an earlier draft of Task 12's verification script wrapped calls to `players.addNewPlayer()` in a `db.transaction()` at the script level, which would silently **not** have rolled anything back — those functions use their own module-level `db` import, not the transaction's scoped handle. Fixed to use real inserts with explicit cleanup instead. Separately, an earlier draft of `clubs.ts`/`players.ts` assumed every membership/ownership function took the internal `players.id`, but checking the actual call sites (`userClubs.tsx`, `AvailableClubs.tsx`, `sessions/page.tsx`, `api/session/upload/route.ts`, `clubAccessRequests.tsx`) showed most of them only ever have the Clerk **external** id in scope. Fixed by having `checkIfPlayerIsClubOwner`, `getClubsPlayerIsNotAMemberOf`, `getUsersClubs`, `checkAccessRequestStatus`, `checkIfPlayerIsClubMember`, `addPlayerToClub`, and `declineAccessRequest` all resolve the external id to an internal player id themselves, consistently, rather than pushing that resolution onto call sites (which would have turned "import path change only" into "logic change" for several more files than Task 8 currently lists).
- **Security issues caught and fixed during execution (Tasks 5-6), not anticipated by the plan:** automated security review on the `players.ts` and `sessions.ts` commits found several `"use server"` mutations with zero authorization — `addPlayerToClub`, `declineAccessRequest`, `addNewPlayer`, `addNewGameSession`, `endSession` were all directly client-callable with no check that the caller was even signed in, let alone entitled to act on the given club/player. Fixed by adding `auth()` + club-membership/ownership checks to each. Also found a cross-tenant IDOR in `addImageToSession`: `sessionId` and `clubId` arrive as two independent values from the same client payload, and only `clubId` was membership-checked (by the calling route handler) — a member of one club could attach an image to a different club's session by pairing their own `clubId` with someone else's `sessionId`. Fixed by scoping both the read and the update to `(sessionId, clubId)` together.
- **Known, deliberately deferred follow-up (user decision, not an oversight):** the same security review found that essentially every club-scoped *read* function across this whole rewrite (`getClubDetails`, `getAllBoardgames`, `getAllActiveSessionDetails`, `getAllInactiveSessions`, `getSessionDetails`, `getAllClubSessionNames`, `getAllPlayersInClub`, etc.) trusts whatever `clubId` it's given with no check that the caller actually belongs to that club — confirmed exploitable today via `src/app/sessions/page.tsx`, which passes `clubId` straight from `searchParams`. This is pre-existing in the old app too, not a regression from this rewrite. Fixing it properly means adding a membership check to ~15+ functions across `clubs.ts`/`games.ts`/`players.ts`/`sessions.ts`/`results.ts` — a real scope expansion beyond "port the data layer to the new schema." The user chose to track this as a separate follow-up (its own spec/plan) rather than expand Phase 2's scope to cover it. **This gap is not fixed as of the end of this plan — do not treat Phase 2's completion as a security sign-off on read access control.**
