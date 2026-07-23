# Mobile Redesign — Phase 1: Foundations & Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay every foundation the mobile redesign's screens will need — design tokens, Archivo font, dark-mode infrastructure, icon library, a schema migration for club photos, and the three server-side gaps the design doc exposed (reopen a finished session, edit an existing result, club stats aggregation) — without touching any routes or building any new screens.

**Architecture:** This phase is deliberately additive and non-destructive. The existing app (old Tailwind colors, old TopNav, old routes under `/sessions`, `/players`, `/add/*`) keeps working exactly as it does today; nothing is deleted. New design tokens are added alongside the old `tunnel-snake-*` colors. New server actions and a new read module are added as plain exports that nothing calls yet. This lets Phase 1 ship and be verified (`npm run build` + the existing node-script test suite) entirely on its own, with zero risk to the running app, before Phase 2 starts building the 12 redesigned screens against this foundation. One visible side effect is intentional: swapping the global font from Montserrat to Archivo changes the look of every existing page immediately — that's expected, not a bug.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + `@vercel/postgres`, Tailwind CSS 3.3 (CSS-variable-backed theme, not Tailwind's `dark:` class variant), `next-themes` for the `data-theme` toggle infra, `lucide-react` for icons, `next/font/google` for Archivo. Testing follows this repo's existing convention exactly: no Jest/Vitest exists here — `scripts/verify-schema.js` checks raw SQL/DDL, `scripts/verify-data-layer.js` compiles `src/app/lib/db/*` with `tsc` and calls the real exported functions against fixture rows in the live dev database, cleaning up in a `finally` block.

---

## Why CSS variables instead of Tailwind's `dark:` variant

Tailwind 3.3 (the version pinned in this repo) only supports `darkMode: "class"` or `"media"` — attribute-based dark mode (`darkMode: ["selector", '[data-theme="dark"]']`) wasn't added until Tailwind 3.4.1. Bumping Tailwind is out of scope for this phase. Instead, every themed color is a Tailwind color that resolves to a CSS custom property (e.g. `bg-bg` → `background-color: var(--color-bg)`), and `globals.css` defines two blocks: `:root { --color-bg: #f3f2f2; ... }` for light, and `:root[data-theme="dark"] { --color-bg: #1b1918; ... }` for dark. `next-themes` is what flips the `data-theme` attribute on `<html>`. No `dark:` variant classes are used anywhere in the new design system — the variable does the switching.

---

### Task 1: Design tokens, Archivo font, and zero-radius theme

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add the CSS custom properties for both themes**

Append this to the end of `src/app/globals.css` (the existing `@tailwind` directives, old `:root` block, and `body`/`.text-balance` rules all stay untouched above it):

```css
/* Mobile redesign design tokens (see design_handoff_mobile_redesign/README.md).
   Tailwind 3.3 has no attribute-based dark mode, so these are plain CSS
   variables flipped by next-themes setting data-theme on <html>, not
   Tailwind's dark: class variant. */
:root {
  --color-bg: #f3f2f2;
  --color-bg-page: #f3f2f2;
  --color-surface: #eae9e9;
  --color-text: #201e1d;
  --color-divider: color-mix(in srgb, #201e1d 40%, transparent);

  --color-accent: #ec3013;
  --color-accent-100: #fff2ef;
  --color-accent-200: #ffe0d9;
  --color-accent-300: #ffc4b8;
  --color-accent-600: #dd2b0f;
  --color-accent-700: #ae1800;
  --color-accent-800: #7c1405;
  --color-accent-900: #4d170e;

  --color-neutral-100: #f8f4f4;
  --color-neutral-200: #eae7e7;
  --color-neutral-300: #d7d3d3;
  --color-neutral-400: #bab6b6;
  --color-neutral-500: #9b9797;
}

:root[data-theme="dark"] {
  --color-bg: #1b1918;
  --color-bg-page: #141211;
  --color-surface: #242120;
  --color-text: #f0eeec;
  --color-divider: color-mix(in srgb, #f0eeec 40%, transparent);

  --color-accent-100: #4d170e;
  --color-accent-200: #7c1405;
  --color-accent-300: #ae1800;
  --color-accent-600: #ff7a61;
  --color-accent-700: #ffc4b8;
  --color-accent-800: #ffe0d9;

  --color-neutral-100: #2a2726;
  --color-neutral-200: #343130;
  --color-neutral-300: #454140;
  --color-neutral-400: #5d5958;
}
```

- [ ] **Step 2: Point Tailwind's theme at the new variables and zero every radius**

Replace the full contents of `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-archivo)", "sans-serif"],
        archivo: ["var(--font-archivo)", "sans-serif"],
      },
      colors: {
        // Legacy palette - still used by the pre-redesign screens until
        // Phase 2+ replaces them. Left in place so nothing currently
        // rendering breaks.
        "tunnel-snake-black": "#020202",
        "tunnel-snake-green": "#96C431",
        "tunnel-snake-orange": "#FE8A1F",
        "tunnel-snake-grey": "#141813",
        "tunnel-snake-red": "#de0202",

        // Mobile redesign tokens - see design_handoff_mobile_redesign/README.md
        bg: "var(--color-bg)",
        "bg-page": "var(--color-bg-page)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        divider: "var(--color-divider)",
        accent: {
          DEFAULT: "var(--color-accent)",
          100: "var(--color-accent-100)",
          200: "var(--color-accent-200)",
          300: "var(--color-accent-300)",
          600: "var(--color-accent-600)",
          700: "var(--color-accent-700)",
          800: "var(--color-accent-800)",
          900: "var(--color-accent-900)",
        },
        neutral: {
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          400: "var(--color-neutral-400)",
          500: "var(--color-neutral-500)",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "0px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Swap the global font from Montserrat to Archivo**

Replace the full contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import TopNav from "./ui/sessions/topNav";
import { Suspense } from "react";

const archivo = Archivo({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tunnel Snakes Rule",
  description: "We rule!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable}>
      <ClerkProvider>
        <body className="">
          <Suspense>
            <TopNav />
          </Suspense>
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
```

Note what changed and what didn't: `TopNav` and `ClerkProvider` stay exactly where they are — Phase 2 replaces the nav with the bottom-tab shell, not this phase. Only the font import/variable and the `<html>` className changed (from Montserrat's `.className` string to Archivo's `.variable`, which is what makes `var(--font-archivo)` resolve in `tailwind.config.ts`).

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: build succeeds. This is the check called out by this repo's own history (see commit `131bc85`) — `tsc`/`eslint` passing is not sufficient proof a Next.js build with font loaders and provider composition actually works; only a real `next build` catches it.

- [ ] **Step 5: Manual visual check**

Run: `npm run dev`, open the app in a browser, confirm the existing pages (home, sessions, players) now render in Archivo instead of Montserrat, and that nothing else changed (TopNav still there, old colors still there).

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat: add mobile-redesign design tokens, zero-radius theme, and Archivo font"
```

---

### Task 2: Dark-mode provider and icon library

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install the two new dependencies**

Run: `npm install next-themes lucide-react`

Expected: both added to `dependencies` in `package.json` and `package-lock.json`/`yarn.lock` updated, install completes without peer-dependency errors against React 19.

- [ ] **Step 2: Wire the theme provider into the root layout**

Modify `src/app/layout.tsx` (from Task 1) — add the import and wrap `children`:

```tsx
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import TopNav from "./ui/sessions/topNav";
import { Suspense } from "react";

const archivo = Archivo({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tunnel Snakes Rule",
  description: "We rule!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <ClerkProvider>
        <body className="">
          <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false} storageKey="tsr-theme">
            <Suspense>
              <TopNav />
            </Suspense>
            {children}
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` is required by `next-themes` itself (documented behavior) because it sets the `data-theme` attribute before hydration to avoid a flash of the wrong theme; without it React logs a hydration mismatch warning for an attribute it doesn't control. `enableSystem={false}` is deliberate: the design doc specifies an explicit toggle button with a persisted choice, not automatic OS-preference switching. The toggle button itself (moon/sun icon) is a Phase 2 concern (it lives in the Clubs tab header) — this step only wires the provider so `useTheme()` is available once that button exists.

- [ ] **Step 3: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 4: Manually verify the token wiring end-to-end**

Run: `npm run dev`, open the app, open devtools console, and run:

```js
getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
```

Expected: `#f3f2f2`. Then run:

```js
document.documentElement.setAttribute('data-theme', 'dark')
getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
```

Expected: `#1b1918`. This proves the CSS variable / dark-theme override wiring from Task 1 actually works, even though no component consumes it yet. Reset with `document.documentElement.removeAttribute('data-theme')` or just reload the page afterward.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "feat: wire next-themes provider and add lucide-react for the mobile redesign"
```

(Use whichever lockfile this repo actually updates — check `git status` first; this repo's tracked lockfile may be `yarn.lock` per the working tree shown at session start, in which case `git add yarn.lock` instead of `package-lock.json`.)

---

### Task 3: Schema migration — club photo

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/app/lib/definitions.ts`
- Modify: `src/app/lib/db/clubs.ts`
- Modify: `scripts/verify-schema.js`
- Create: a new file under `./drizzle/` (generated by `drizzle-kit`, not hand-written)

- [ ] **Step 1: Add the column to the schema**

In `src/db/schema.ts`, modify the `clubs` table definition:

```ts
export const clubs = pgTable("clubs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => players.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  avatar: text("avatar"),
});
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npm run db:generate`

Expected: a new `NNNN_<name>.sql` file appears under `./drizzle/` containing `ALTER TABLE "clubs" ADD COLUMN "avatar" text;` (nullable, so this is a safe, non-breaking migration against existing rows).

Run: `npm run db:migrate`

Expected: command reports the migration applied successfully against `POSTGRES_URL`.

- [ ] **Step 3: Extend the schema verification script**

In `scripts/verify-schema.js`, the round-trip check (`checkRoundTripAndConstraints`) currently inserts a club without an avatar. Add an explicit assertion that the new column exists and defaults to null, right after the existing club insert (which is this line: ``const club = await client.query(`INSERT INTO clubs (name, owner_id) VALUES ('Verify Schema Club', $1) RETURNING id`, [playerId]);``). Change that block to select and assert the new column:

```js
    const club = await client.query(
      `INSERT INTO clubs (name, owner_id) VALUES ('Verify Schema Club', $1) RETURNING id, avatar`,
      [playerId]
    );
    const clubId = club.rows[0].id;
    if (club.rows[0].avatar !== null) {
      throw new Error(`Expected clubs.avatar to default to null, got ${JSON.stringify(club.rows[0].avatar)}`);
    }

    await client.query(`UPDATE clubs SET avatar = 'https://example.com/photo.jpg' WHERE id = $1`, [clubId]);
    const updated = await client.query(`SELECT avatar FROM clubs WHERE id = $1`, [clubId]);
    if (updated.rows[0].avatar !== 'https://example.com/photo.jpg') {
      throw new Error('clubs.avatar did not round-trip a written value');
    }
    console.log('clubs.avatar column present, nullable, and round-trips correctly.');
```

- [ ] **Step 4: Run the schema verification script**

Run: `npm run db:verify`

Expected: prints `Schema verification passed.` and exits 0. This confirms the migration applied and the new column behaves as expected, and (per the script's existing `ROLLBACK`) leaves no data behind.

- [ ] **Step 5: Update the `Club` type and its mapper**

In `src/app/lib/definitions.ts`, modify the `Club` type:

```ts
export type Club = {
  id: string;
  name: string;
  createdDate: Date;
  owner: string;
  avatar: string;
};
```

In `src/app/lib/db/clubs.ts`, modify `toClub`:

```ts
function toClub(row: typeof clubs.$inferSelect): Club {
  return {
    id: row.id,
    name: row.name,
    createdDate: row.createdAt,
    owner: row.ownerId,
    avatar: row.avatar ?? "",
  };
}
```

(This mirrors `players.ts`'s existing `toPlayer` mapper, which does the same `row.avatar ?? ""` for the same reason: the column is nullable in the DB, but UI code shouldn't have to deal with `null` vs `""` as two different "no photo" states.)

- [ ] **Step 6: Add the write function for club photo uploads**

In `src/app/lib/db/clubs.ts`, add (this mirrors `addImageToPlayer` in `players.ts` and `addImageToSession` in `sessions.ts` — a write that lives in the reads-only file because, like those two, it will only ever be called from a Route Handler in Phase 2, never from a `"use client"` component directly, so it doesn't need `"use server"`):

```ts
export async function addImageToClub(blobUri: string, clubId: string) {
  await db.update(clubs).set({ avatar: blobUri }).where(eq(clubs.id, clubId));
  revalidatePath("/clubs");
}
```

This requires adding `revalidatePath` to the imports at the top of `clubs.ts`:

```ts
import { revalidatePath } from "next/cache";
```

(The `/clubs` path doesn't exist as a route yet — Phase 2 creates it. `revalidatePath` doesn't validate the route exists at call time, so this is safe to add now; it becomes a real cache invalidation once Phase 2's Clubs tab route exists.)

- [ ] **Step 7: Verify the build**

Run: `npm run build`

Expected: succeeds. `clubs.ts` has `import "server-only"` at the top — this step is exactly the class of check called out in this repo's own past incident (commit `131bc85`), confirming the new write function didn't accidentally break the server-only/client-component boundary.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts src/app/lib/definitions.ts src/app/lib/db/clubs.ts scripts/verify-schema.js drizzle/
git commit -m "feat: add clubs.avatar column for club photo uploads"
```

---

### Task 4: `reopenSession` server action

**Files:**
- Modify: `src/app/lib/db/sessions-actions.ts`

- [ ] **Step 1: Add the action**

`sessions-actions.ts` already has `endSession` (sets `active: false`). Add its mirror image directly below it:

```ts
export async function reopenSession(id: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) {
    throw new Error(`Session ${id} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ active: true }).where(eq(sessions.id, id));
  revalidatePath("/sessions");
}
```

No new imports are needed — `sessions`, `eq`, `revalidatePath`, and `assertIsClubMember` are all already imported/defined in this file for `endSession`.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Note on testing**

This function is not covered by `scripts/verify-data-layer.js`, matching the existing, documented precedent for every other `auth()`-gated write in this domain (see the header comment in that script): it calls Clerk's `auth()` internally, which throws outside a real request context, so it can't be called directly from a standalone Node script. Its correctness is proven the same way `endSession`'s and `recordPlayResults`'s write-branching already are — by real browser use once Phase 2 wires the "Reopen session" button to it.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/sessions-actions.ts
git commit -m "feat: add reopenSession action for the reversible finish/reopen toggle"
```

---

### Task 5: `updatePlayResults` — edit an existing result

**Files:**
- Modify: `src/app/lib/db/results-actions.ts`

The design doc's "Edit result" screen rehydrates the form from an existing play and, on save, "replaces the play." `recordPlayResults` currently only inserts. This task factors its win-condition branching out into a shared helper so `updatePlayResults` can reuse it exactly, rather than duplicating the five-way switch.

- [ ] **Step 1: Replace the full contents of `results-actions.ts`**

```ts
"use server";
// src/app/lib/db/results-actions.ts
//
// Server Actions for the results domain: recordPlayResults (insert a new
// play) and updatePlayResults (replace an existing play's results in
// place, for the design doc's "Edit result" screen). Split out of
// results.ts - see the header comment in players.ts for why. Must NOT
// `import "server-only"`.
//
// This is the module the schema spec's invariants are about: these two
// functions are the *only* places that resolve a play's effective win
// condition and write to one of the three result tables.
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

// Shared by recordPlayResults (new play) and updatePlayResults (replace an
// existing play) so the five-way win-condition branching lives in exactly
// one place. Both callers have already inserted/kept the `plays` row by
// the time this runs - this only writes the *result* rows.
async function writeResultRows(
  playId: string,
  rules: EffectiveRules,
  checkedPlayers: CheckedPlayerEntry[],
  formData: FormData
) {
  switch (rules.winCondition) {
    case "leaderboard": {
      for (const entry of checkedPlayers) {
        await db.insert(leaderboardResults).values({
          playId,
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
          playId,
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
          playId,
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
      // The participant checkboxes and the winner/loser avatar picker are two
      // independent form controls (not wired together client-side), so a
      // stale or tampered submission could name a selected player who was
      // unchecked as a participant. Failing loudly here beats silently
      // writing a play where nobody actually won/lost, or everybody did.
      if (participantIds.length === 0) {
        throw new Error("At least one participant must be selected");
      }
      if (!selectedPlayerId || !participantIds.includes(selectedPlayerId)) {
        throw new Error(
          rules.winCondition === "single_winner"
            ? "The selected winner must be one of the checked participants"
            : "The selected loser must be one of the checked participants"
        );
      }
      for (const playerId of participantIds) {
        const isSelected = playerId === selectedPlayerId;
        const won = rules.winCondition === "single_winner" ? isSelected : !isSelected;
        await db.insert(outcomeResults).values({ playId, playerId, won });
      }
      break;
    }
  }
}

export async function recordPlayResults(formData: FormData) {
  const sessionId = formData.get("sessionId")?.toString();
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString() ?? null;

  if (!sessionId || !gameId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Authorize against the session's own clubId, resolved server-side, rather
  // than a client-supplied clubId field: sessionId and clubId arrive as two
  // independent form values, and checking membership against a clubId the
  // caller can set independently of sessionId would let a member of one
  // club record results against another club's session (the same class of
  // cross-tenant IDOR already fixed in addImageToSession).
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  const clubId = session.clubId;
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  const rules = await resolveEffectiveRules(clubId, gameId);
  const checkedPlayers = parseCheckedPlayers(formData);

  const [play] = await db
    .insert(plays)
    .values({ id: uuidv4(), sessionId, gameId, notes })
    .returning();

  await writeResultRows(play.id, rules, checkedPlayers, formData);

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}

// Replaces an existing play's game/notes/results in place, for the design
// doc's "Edit result" screen ("Save: ... appends or replaces the play").
// Keeps the same play id (only the three result tables are deleted and
// rewritten) so anything referencing this play's id externally stays
// valid across an edit.
export async function updatePlayResults(playId: string, formData: FormData) {
  const gameId = formData.get("gameId")?.toString();
  const notes = formData.get("gameResultNotes")?.toString() ?? null;

  if (!gameId) {
    throw new Error("Missing required fields");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) {
    throw new Error(`Play ${playId} not found`);
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.id, play.sessionId));
  if (!session) {
    throw new Error(`Session ${play.sessionId} not found`);
  }
  const clubId = session.clubId;
  const isMember = await checkIfPlayerIsClubMember(userId, clubId);
  if (!isMember) {
    throw new Error("Forbidden");
  }

  // Only one of these three tables ever has rows for a given play; deleting
  // from all three is a no-op on the other two, and simpler than branching
  // on the play's previous win condition to know which one to clear.
  await db.delete(leaderboardResults).where(eq(leaderboardResults.playId, playId));
  await db.delete(teamResults).where(eq(teamResults.playId, playId));
  await db.delete(outcomeResults).where(eq(outcomeResults.playId, playId));
  await db.update(plays).set({ gameId, notes }).where(eq(plays.id, playId));

  const rules = await resolveEffectiveRules(clubId, gameId);
  const checkedPlayers = parseCheckedPlayers(formData);
  await writeResultRows(playId, rules, checkedPlayers, formData);

  revalidatePath("/sessions");
  revalidatePath("/players");
  redirect(`/sessions?clubId=${clubId}`);
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds — this is the exact file shape (`"use server"` as the literal first line, no `import "server-only"` anywhere in the file) that this repo's own commit history had to fix once already (`05a32b6`).

- [ ] **Step 3: Note on testing**

Like `reopenSession`, this isn't covered by `scripts/verify-data-layer.js` — it calls `auth()` internally. `writeResultRows`'s branching logic itself is unchanged from the code `recordPlayResults` already ran in production (only lifted into a shared function), so no new logic risk was introduced there; `updatePlayResults`'s delete-then-rewrite sequence gets its real coverage from Phase 2's manual browser verification of the Edit result screen.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/results-actions.ts
git commit -m "refactor: extract writeResultRows and add updatePlayResults for editing a play"
```

---

### Task 6: Club stats aggregation

**Files:**
- Create: `src/app/lib/db/stats.ts`
- Modify: `scripts/verify-data-layer.js`

- [ ] **Step 1: Write the failing assertions first**

In `scripts/verify-data-layer.js`, the `compile()` function's `tsconfig.include` array currently lists `rules.ts`, `players.ts`, `clubs.ts`, `games.ts`, `games-actions.ts`, `sessions.ts`, `results.ts`, `definitions.ts`. Add `'src/app/lib/db/stats.ts'` to that array:

```js
    include: [
      'src/db/schema.ts',
      'src/db/client.ts',
      'src/app/lib/db/rules.ts',
      'src/app/lib/db/players.ts',
      'src/app/lib/db/clubs.ts',
      'src/app/lib/db/games.ts',
      'src/app/lib/db/games-actions.ts',
      'src/app/lib/db/sessions.ts',
      'src/app/lib/db/results.ts',
      'src/app/lib/db/stats.ts',
      'src/app/lib/definitions.ts',
    ],
```

Then, in `main()`, add the require alongside the others near the top:

```js
  const stats = require(path.join(OUT_DIR, 'app/lib/db/stats.js'));
```

Then add a new section at the end of the `try` block, right before the `} finally {` line (after the existing `sessions.ts getAllPlayersBySessionId OK` console.log from section 5). This builds one club with 4 members, one leaderboard game (high-wins) and one single_loser game, two plays covering both branches, and asserts the exact wins/played tally and sort order:

```js
    // ------------------------------------------------------------------
    // 6. stats.ts - getClubStats. Reuses club/session fixtures from steps
    //    2 and 4 above; adds a fourth member (fourthPlayer) who never
    //    plays, to prove the leaderboard excludes zero-played members.
    // ------------------------------------------------------------------
    const [fourthPlayer] = await db
      .insert(schema.players)
      .values({ externalId: `${MARKER}-fourth`, name: `${MARKER}-Fourth` })
      .returning();
    fixtures.playerIds.push(fourthPlayer.id);
    await db.insert(schema.clubMembers).values({ playerId: fourthPlayer.id, clubId: club.id });

    const [gameSingleLoser] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Single Loser Game`, winCondition: 'single_loser', scoringDirection: null })
      .returning();
    fixtures.gameIds.push(gameSingleLoser.id);

    const [statsSession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Stats Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(statsSession.id);

    // Leaderboard play: high score wins. otherPlayer scores highest (20) so
    // otherPlayer should get the win; memberPlayer and ownerPlayer both played
    // but didn't win.
    const [statsPlayLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: statsSession.id, gameId: gameLeaderboard.id })
      .returning();
    fixtures.playIds.push(statsPlayLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: statsPlayLeaderboard.id, playerId: ownerPlayer.id, score: 5 },
      { playId: statsPlayLeaderboard.id, playerId: memberPlayer.id, score: 10 },
      { playId: statsPlayLeaderboard.id, playerId: otherPlayer.id, score: 20 },
    ]);

    // Single-loser play: outcomeResults already encodes "won" per player at
    // write time (see writeResultRows) - otherPlayer is the loser (won:
    // false), ownerPlayer and memberPlayer both "won" (won: true).
    const [statsPlaySingleLoser] = await db
      .insert(schema.plays)
      .values({ sessionId: statsSession.id, gameId: gameSingleLoser.id })
      .returning();
    fixtures.playIds.push(statsPlaySingleLoser.id);
    await db.insert(schema.outcomeResults).values([
      { playId: statsPlaySingleLoser.id, playerId: ownerPlayer.id, won: true },
      { playId: statsPlaySingleLoser.id, playerId: memberPlayer.id, won: true },
      { playId: statsPlaySingleLoser.id, playerId: otherPlayer.id, won: false },
    ]);

    const clubStats = await stats.getClubStats(club.id);
    assertEqual(clubStats.sessionCount, 2, 'getClubStats sessionCount should count both fixture sessions for this club');
    assertEqual(clubStats.resultCount, 5, 'getClubStats resultCount should count every play across both sessions (3 from step 5 + 2 here)');

    // otherPlayer is deliberately NOT a club_members row (see section 2's
    // comment above) despite having the most wins and the most plays of anyone -
    // getAllPlayersInClub only returns current members, so the tally map
    // never has an entry for otherPlayer, and they must not appear here no
    // matter how many plays/wins their result rows show.
    assert(
      !clubStats.leaderboard.some((r) => r.playerId === otherPlayer.id),
      'getClubStats leaderboard should exclude otherPlayer, who is not a club member'
    );

    // ownerPlayer only appears in this task's two new plays: statsPlayLeaderboard
    // (played, didn't win - otherPlayer's score of 20 beats their 5) and
    // statsPlaySingleLoser (played, won: true). played:2, wins:1.
    const ownerRow = clubStats.leaderboard.find((r) => r.playerId === ownerPlayer.id);
    assert(ownerRow, 'getClubStats leaderboard should include ownerPlayer');
    assertEqual(ownerRow.played, 2, 'ownerPlayer should show played:2 (both of this task\'s new plays)');
    assertEqual(ownerRow.wins, 1, 'ownerPlayer should have exactly 1 win (the single_loser play, since they were not the loser)');

    // memberPlayer appears in all 5 plays across both sessions: the 3 from
    // step 5 (playOutcome: won; playLeaderboard: played, lost to otherPlayer's
    // higher score; playTeamTied: played, no winner) plus this task's 2
    // (statsPlayLeaderboard: played, lost; statsPlaySingleLoser: won).
    // played:5, wins:2 (playOutcome + statsPlaySingleLoser).
    const memberRow = clubStats.leaderboard.find((r) => r.playerId === memberPlayer.id);
    assert(memberRow, 'getClubStats leaderboard should include memberPlayer');
    assertEqual(memberRow.played, 5, 'memberPlayer should show played:5 across both sessions');
    assertEqual(memberRow.wins, 2, 'memberPlayer should have exactly 2 wins (playOutcome + statsPlaySingleLoser)');

    assert(
      !clubStats.leaderboard.some((r) => r.playerId === fourthPlayer.id),
      'getClubStats leaderboard should exclude fourthPlayer, who never played'
    );

    assertEqual(clubStats.leaderboard.length, 2, 'getClubStats leaderboard should have exactly 2 rows: memberPlayer and ownerPlayer');
    assertEqual(clubStats.leaderboard[0].playerId, memberPlayer.id, 'getClubStats leaderboard should sort by wins desc, placing memberPlayer (2 wins) before ownerPlayer (1 win)');
    console.log('stats.ts getClubStats OK (leaderboard direction + outcome-based winners + non-member exclusion + wins-desc sort)');
```

- [ ] **Step 2: Run the script to confirm it fails for the right reason**

Run: `npm run db:verify-layer`

Expected: fails at the `compile()` step with a TypeScript error like `Cannot find module '@/app/lib/db/stats'` or a missing-file error from the `tsconfig.include` referencing a file that doesn't exist yet — proving the test is actually exercising code that isn't written yet, not passing vacuously.

- [ ] **Step 3: Implement `getClubStats`**

Create `src/app/lib/db/stats.ts`:

```ts
// src/app/lib/db/stats.ts
//
// Reads only. Aggregates the per-club "Club stats" screen: total
// sessions/results, and a per-member wins/played leaderboard.
//
// Win attribution reuses the "won" boolean writeResultRows (in
// results-actions.ts) already writes for every non-leaderboard condition -
// team_based, cooperative, single_winner, and single_loser all store the
// correct per-player winner as teamResults.won / outcomeResults.won at
// write time. Only leaderboard_results has no "won" column, since the
// winner there depends on the game's scoring direction, so that's the one
// branch this function computes itself, via resolveEffectiveRules - the
// same source of truth writeResultRows used when the play was recorded.
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sessions,
  plays,
  leaderboardResults,
  teamResults,
  outcomeResults,
} from "@/db/schema";
import { resolveEffectiveRules } from "./rules";
import { getAllPlayersInClub } from "./sessions";

export type ClubStatsRow = {
  playerId: string;
  name: string;
  wins: number;
  played: number;
};

export type ClubStats = {
  sessionCount: number;
  resultCount: number;
  leaderboard: ClubStatsRow[];
};

export async function getClubStats(clubId: string): Promise<ClubStats> {
  const clubSessions = await db.select().from(sessions).where(eq(sessions.clubId, clubId));
  const sessionIds = clubSessions.map((s) => s.id);

  const members = await getAllPlayersInClub(clubId);
  const tally = new Map<string, ClubStatsRow>(
    members.map((m) => [m.id, { playerId: m.id, name: m.name, wins: 0, played: 0 }])
  );

  if (sessionIds.length === 0) {
    return { sessionCount: 0, resultCount: 0, leaderboard: [] };
  }

  const sessionPlays = await db.select().from(plays).where(inArray(plays.sessionId, sessionIds));

  for (const play of sessionPlays) {
    const [leaderboardRows, teamRows, outcomeRows] = await Promise.all([
      db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
      db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
      db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
    ]);

    const participantIds = [
      ...leaderboardRows.map((r) => r.playerId),
      ...teamRows.map((r) => r.playerId),
      ...outcomeRows.map((r) => r.playerId),
    ];
    for (const id of participantIds) {
      const row = tally.get(id);
      if (row) row.played += 1;
    }

    let winnerIds: string[];
    if (leaderboardRows.length > 0) {
      const rules = await resolveEffectiveRules(clubId, play.gameId);
      const highScoreWins = rules.scoringDirection !== "low";
      const best = leaderboardRows.reduce((acc, row) =>
        highScoreWins ? (row.score > acc.score ? row : acc) : (row.score < acc.score ? row : acc)
      );
      winnerIds = [best.playerId];
    } else if (teamRows.length > 0) {
      winnerIds = teamRows.filter((r) => r.won).map((r) => r.playerId);
    } else {
      winnerIds = outcomeRows.filter((r) => r.won).map((r) => r.playerId);
    }
    for (const id of winnerIds) {
      const row = tally.get(id);
      if (row) row.wins += 1;
    }
  }

  const leaderboard = [...tally.values()]
    .filter((row) => row.played > 0)
    .sort((a, b) => b.wins - a.wins || b.played - a.played);

  return {
    sessionCount: clubSessions.length,
    resultCount: sessionPlays.length,
    leaderboard,
  };
}
```

- [ ] **Step 4: Run the script again and confirm it passes**

Run: `npm run db:verify-layer`

Expected: prints `stats.ts getClubStats OK (leaderboard direction + outcome-based winners + non-member exclusion + wins-desc sort)` followed by `Data-access layer verification passed.`, exit 0, and no leftover `verify-layer`-prefixed rows in the database afterward (the script's `finally` block cleans up `fixtures.playerIds` — which now includes `fourthPlayer` — and `fixtures.gameIds`/`sessionIds`/`playIds`, all of which the new step already pushed onto).

- [ ] **Step 5: Verify the full build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/stats.ts scripts/verify-data-layer.js
git commit -m "feat: add getClubStats aggregation for the club stats screen"
```

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run every check this repo has, in order**

```bash
npm run lint
npm run build
npm run db:verify
npm run db:verify-layer
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual smoke test of the untouched app**

Run: `npm run dev` and click through the existing (pre-redesign) flows once — home page, sign in, viewing a club's sessions, players tab — confirming everything still works exactly as before Phase 1, just in Archivo instead of Montserrat. This is the "produces working, testable software on its own" bar for a foundations-only phase: nothing regressed, and the new tokens/actions/read function are proven correct even though no screen consumes them yet.

- [ ] **Step 3: Final review before handing off to Phase 2**

Confirm via `git log --oneline -8` that Task 1 through Task 6's commits are all present, and via `git status` that the working tree is clean.

---

## What Phase 2 picks up from here

Phase 2 (not part of this plan) builds the bottom-tab shell and the first group of screens (Login, Clubs tab, New club, Club detail, Sessions tab, Players tab), and is the point where:
- The old `TopNav` finally gets removed and replaced.
- Old routes (`/sessions?clubId=`, `/players`, `/requests`, `/add/club`, `/add/game`) get replaced by the new nested `/clubs/[clubId]/...` structure described in the design doc, and the `revalidatePath`/`redirect` targets in `clubs-actions.ts`, `players-actions.ts`, `games-actions.ts`, `sessions-actions.ts`, `results-actions.ts`, and `sessions.ts`'s `addImageToSession` get updated to match.
- The dark-mode toggle button (moon/sun) and the `/api/club/upload` route (using `addImageToClub` from Task 3) get built and wired to real UI for the first time.
