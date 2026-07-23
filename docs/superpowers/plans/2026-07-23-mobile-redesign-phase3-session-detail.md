# Mobile Redesign — Phase 3: Session Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the real Session Detail screen (notes, photos, finish/reopen, and a results list with per-play summary/detail strings) at `/clubs/[clubId]/sessions/[sessionId]`, retiring the `sessions/previousSession` bridge page that every Phase 2 screen has been linking to instead.

**Architecture:** One new read function (`getSessionPlaySummaries`) computes the win-condition-aware summary/detail strings the design calls for, reusing `resolveEffectiveRules` the same way Phase 1's `getClubStats` did (not `getEventWinner`, which has a known, undocumented-until-now divergence — it collapses cooperative/single_winner/single_loser into "one player's name" instead of the condition-specific phrasing this screen needs, and doesn't account for club rule variants either). A real bug in `addImageToSession` gets fixed along the way: it calls `next/navigation`'s `redirect()` from inside a Route Handler, where that function doesn't behave as it does in Server Components/Actions — the throw gets caught by the route's own try/catch and silently turned into a generic error response every time, even though the actual database write already succeeded. This phase applies the membership-check lesson from Phase 2 from the very first commit, not as a retrofit. **Add/Edit Result and the real Club Stats UI are explicitly out of scope** — Session Detail's "Add result" button bridges to the existing, untouched `/add/result?sessionId=...&clubId=...` page for now, and there's no "Edit" affordance on play rows yet (there's no page to link it to — the old app never had one, and the new one isn't built until Phase 4).

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Clerk auth, `@vercel/blob/client` for photo uploads (reusing the existing `/api/session/upload` Route Handler), the Phase 1/2 design-token system and `src/app/ui/ds/` component library. Testing follows the same convention as every prior phase: `scripts/verify-data-layer.js` for the new pure-read function (TDD, red-then-green), `npm run build` for everything else.

---

### Task 1: `getSessionPlaySummaries` — win-condition-aware play summaries

**Files:**
- Modify: `src/app/lib/db/results.ts`
- Modify: `scripts/verify-data-layer.js`

**Step 1: Write the failing test first**

Read `scripts/verify-data-layer.js` in full to confirm its current exact state (it should end its `try` block right after the `stats.ts getClubStats OK...` line from the Phase 1 work, i.e. its current final section).

In the `compile()` function's `tsconfig.include` array, `src/app/lib/db/results.ts` should already be listed (it was needed for `getEventWinner` earlier) — confirm this, no change needed there.

Add this new section at the end of the `try` block, right before the `} finally {` line, immediately after the `stats.ts getClubStats OK...` console.log:

```js
    // ------------------------------------------------------------------
    // 7. results.ts - getSessionPlaySummaries. One play per win condition,
    //    reusing the club/session fixtures already in scope (club.id,
    //    memberPlayer, ownerPlayer, statsSession from step 6 above), plus
    //    one brand-new session so this section's plays don't interfere
    //    with step 6's own wins/played counts.
    // ------------------------------------------------------------------
    const [summarySession] = await db
      .insert(schema.sessions)
      .values({ clubId: club.id, name: `${MARKER}-Summary Session`, date: new Date(), active: true })
      .returning();
    fixtures.sessionIds.push(summarySession.id);

    const [gameTeamBased] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Team Game`, winCondition: 'team_based', scoringDirection: null })
      .returning();
    const [gameCooperative] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Co-op Game`, winCondition: 'cooperative', scoringDirection: null })
      .returning();
    fixtures.gameIds.push(gameTeamBased.id, gameCooperative.id);

    // Leaderboard play: low score wins this time (gameLeaderboard from
    // section 3 is 'high' - use a fresh low-scoring game so both directions
    // get exercised across this file's tests).
    const [gameLowScore] = await db
      .insert(schema.games)
      .values({ name: `${MARKER}-Golf Game`, winCondition: 'leaderboard', scoringDirection: 'low' })
      .returning();
    fixtures.gameIds.push(gameLowScore.id);

    const [playLowScoreLeaderboard] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameLowScore.id, notes: `${MARKER}-house rule` })
      .returning();
    fixtures.playIds.push(playLowScoreLeaderboard.id);
    await db.insert(schema.leaderboardResults).values([
      { playId: playLowScoreLeaderboard.id, playerId: ownerPlayer.id, score: 72 },
      { playId: playLowScoreLeaderboard.id, playerId: memberPlayer.id, score: 68 },
    ]);

    const [playTeam] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameTeamBased.id })
      .returning();
    fixtures.playIds.push(playTeam.id);
    await db.insert(schema.teamResults).values([
      { playId: playTeam.id, playerId: ownerPlayer.id, team: 'A', won: true },
      { playId: playTeam.id, playerId: memberPlayer.id, team: 'B', won: false },
    ]);

    const [playCoop] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameCooperative.id })
      .returning();
    fixtures.playIds.push(playCoop.id);
    await db.insert(schema.outcomeResults).values([
      { playId: playCoop.id, playerId: ownerPlayer.id, won: true },
      { playId: playCoop.id, playerId: memberPlayer.id, won: true },
    ]);

    const [playSingleLoser] = await db
      .insert(schema.plays)
      .values({ sessionId: summarySession.id, gameId: gameSingleLoser.id })
      .returning();
    fixtures.playIds.push(playSingleLoser.id);
    await db.insert(schema.outcomeResults).values([
      { playId: playSingleLoser.id, playerId: ownerPlayer.id, won: true },
      { playId: playSingleLoser.id, playerId: memberPlayer.id, won: false },
    ]);

    const summaries = await results.getSessionPlaySummaries(club.id, summarySession.id);
    assertEqual(summaries.length, 4, 'getSessionPlaySummaries should return one entry per play in this session');

    const leaderboardSummary = summaries.find((s) => s.playId === playLowScoreLeaderboard.id);
    assert(leaderboardSummary, 'missing leaderboard play summary');
    assertEqual(leaderboardSummary.summary, `${memberPlayer.name} won · 68 pts`, 'low-score-wins leaderboard summary should name the lowest scorer');
    assertEqual(leaderboardSummary.detail, `${memberPlayer.name} 68 · ${ownerPlayer.name} 72`, 'leaderboard detail should be sorted low-to-high for a low-wins game');
    assertEqual(leaderboardSummary.notes, `${MARKER}-house rule`, 'leaderboard play notes should pass through unchanged');
    assertEqual(leaderboardSummary.gameName, `${MARKER}-Golf Game`, 'leaderboard play should resolve its game name');

    const teamSummary = summaries.find((s) => s.playId === playTeam.id);
    assert(teamSummary, 'missing team play summary');
    assertEqual(teamSummary.summary, 'Team A won', 'team summary should name the winning team');
    assertEqual(teamSummary.detail, `${ownerPlayer.name} beat ${memberPlayer.name}`, 'team detail should read "winners beat losers"');

    const coopSummary = summaries.find((s) => s.playId === playCoop.id);
    assert(coopSummary, 'missing cooperative play summary');
    assertEqual(coopSummary.summary, 'Everyone won', 'cooperative summary should say Everyone won, not name a player');

    const singleLoserSummary = summaries.find((s) => s.playId === playSingleLoser.id);
    assert(singleLoserSummary, 'missing single_loser play summary');
    assertEqual(singleLoserSummary.summary, `${memberPlayer.name} lost`, 'single_loser summary should name the loser specifically');
    // Built from a plain SELECT with no ORDER BY across 2 rows, so row order
    // isn't guaranteed by SQL semantics - assert membership/shape, not an
    // exact ordering, to avoid a flaky test tied to incidental scan order.
    assert(
      singleLoserSummary.detail.startsWith('Played: ') &&
        singleLoserSummary.detail.includes(ownerPlayer.name) &&
        singleLoserSummary.detail.includes(memberPlayer.name),
      `single_loser detail should list both participants (got ${JSON.stringify(singleLoserSummary.detail)})`
    );
    console.log('results.ts getSessionPlaySummaries OK (leaderboard both directions, team, cooperative, single_loser)');
```

- [ ] **Step 2: Run the script to confirm it fails for the right reason**

Run: `npm run db:verify-layer`

Expected: fails with a TypeScript/runtime error referencing `getSessionPlaySummaries` not being an exported member of the compiled `results.js` module — proving the test exercises code that doesn't exist yet.

- [ ] **Step 3: Implement `getSessionPlaySummaries`**

Read the file first and confirm its existing schema import already includes `plays`, `leaderboardResults`, `teamResults`, `outcomeResults`, and `players` (it should — they're used by `getPlayResultsForPlay`/`getEventWinner` already). The new function below only needs those same tables, nothing extra from `@/db/schema` — do NOT add a second `import { ... } from "@/db/schema"` line; that would re-declare names already imported and fail to compile. If for some reason one of those five isn't already imported, add just that name to the *existing* `@/db/schema` import statement (edit it in place) rather than writing a new import line.

The only genuinely new import this function needs is:

```ts
import { resolveEffectiveRules } from "./rules";
```

Add it as a new line alongside the existing `import { getBoardgameById } from "./games";` line. Do NOT import anything from `./sessions` here — `sessions.ts` already imports `getEventWinner`/`getPlayResultsForPlay` FROM `results.ts` (inside `toGameSession`), so a `results.ts → sessions.ts` import would create a circular module dependency. The function below deliberately looks up player names with its own direct `players` query instead of reusing `sessions.ts`'s `getAllPlayersBySessionId`, specifically to avoid that cycle.

Then add this new exported type and function to the file (after the existing exports, e.g. below `getPlayerEvents`):

```ts
export type PlaySummary = {
  playId: string;
  gameId: string;
  gameName: string;
  summary: string;
  detail: string;
  notes: string | null;
};

// Computes the design doc's per-play summary/detail strings ("Holly won ·
// 11 pts", "Holly 11 · Dan 9 · You 8") at render time rather than storing
// them - the raw leaderboard/team/outcome rows are the source of truth.
// Deliberately does NOT reuse getEventWinner: that function collapses
// cooperative/single_winner/single_loser into "the name of one player with
// won:true", which is right for single_winner but wrong for cooperative
// ("Everyone won"/"The game won", not a player's name) and doesn't
// distinguish single_loser's "X lost" phrasing either. It also reads
// scoring direction off the base game only, ignoring club_game_variants -
// the same divergence already flagged in stats.ts's getClubStats. This
// function uses resolveEffectiveRules instead, matching getClubStats's
// approach, so both screens agree on which play a club's rules make a win.
export async function getSessionPlaySummaries(clubId: string, sessionId: string): Promise<PlaySummary[]> {
  const sessionPlays = await db.select().from(plays).where(eq(plays.sessionId, sessionId));
  if (sessionPlays.length === 0) {
    return [];
  }

  const summaries: PlaySummary[] = [];
  for (const play of sessionPlays) {
    const [game, rules, leaderboardRows, teamRows, outcomeRows] = await Promise.all([
      getBoardgameById(play.gameId),
      resolveEffectiveRules(clubId, play.gameId),
      db.select().from(leaderboardResults).where(eq(leaderboardResults.playId, play.id)),
      db.select().from(teamResults).where(eq(teamResults.playId, play.id)),
      db.select().from(outcomeResults).where(eq(outcomeResults.playId, play.id)),
    ]);

    // Looked up per play (not once for the whole session) so a play's
    // participant list only ever needs the players who actually appear in
    // ITS OWN result rows - a direct query against `players`, not a reuse
    // of sessions.ts's getAllPlayersBySessionId (see the import note above
    // for why: that would create a circular module dependency).
    const participantIds = [
      ...leaderboardRows.map((r) => r.playerId),
      ...teamRows.map((r) => r.playerId),
      ...outcomeRows.map((r) => r.playerId),
    ];
    const nameRows = participantIds.length
      ? await db
          .select({ id: players.id, name: players.name })
          .from(players)
          .where(inArray(players.id, participantIds))
      : [];
    const nameById = new Map(nameRows.map((r) => [r.id, r.name]));
    const nameFor = (id: string) => nameById.get(id) ?? "Unknown";

    let summary = "";
    let detail = "";

    if (leaderboardRows.length > 0) {
      const highWins = rules.scoringDirection !== "low";
      const sorted = [...leaderboardRows].sort((a, b) => (highWins ? b.score - a.score : a.score - b.score));
      summary = `${nameFor(sorted[0].playerId)} won · ${sorted[0].score} pts`;
      detail = sorted.map((r) => `${nameFor(r.playerId)} ${r.score}`).join(" · ");
    } else if (teamRows.length > 0) {
      const winners = teamRows.filter((r) => r.won).map((r) => nameFor(r.playerId));
      const losers = teamRows.filter((r) => !r.won).map((r) => nameFor(r.playerId));
      const winningTeam = teamRows.find((r) => r.won)?.team;
      summary = winningTeam ? `Team ${winningTeam} won` : "Tied";
      detail = `${winners.join(", ") || "No one"} beat ${losers.join(", ") || "no one"}`;
    } else if (rules.winCondition === "cooperative") {
      const anyWon = outcomeRows.some((r) => r.won);
      summary = anyWon ? "Everyone won" : "The game won";
      detail = outcomeRows.map((r) => nameFor(r.playerId)).join(", ");
    } else {
      const isSingleWinner = rules.winCondition === "single_winner";
      const picked = outcomeRows.find((r) => (isSingleWinner ? r.won : !r.won));
      const pickedName = picked ? nameFor(picked.playerId) : "Someone";
      summary = isSingleWinner ? `${pickedName} won` : `${pickedName} lost`;
      detail = `Played: ${outcomeRows.map((r) => nameFor(r.playerId)).join(", ")}`;
    }

    summaries.push({
      playId: play.id,
      gameId: play.gameId,
      gameName: game.name,
      summary,
      detail,
      notes: play.notes,
    });
  }
  return summaries;
}
```

- [ ] **Step 4: Run the script again and confirm it passes**

Run: `npm run db:verify-layer`

Expected: prints `results.ts getSessionPlaySummaries OK (leaderboard both directions, team, cooperative, single_loser)` followed by `Data-access layer verification passed.`, and no leftover `verify-layer`-prefixed rows afterward.

- [ ] **Step 5: Verify the full build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/results.ts scripts/verify-data-layer.js
git commit -m "feat: add getSessionPlaySummaries for the session detail results list"
```

---

### Task 2: `updateSessionNotes` server action

**Files:**
- Modify: `src/app/lib/db/sessions-actions.ts`

**Step 1: Add the action**

Read the file first to confirm `endSession`/`reopenSession`/`assertIsClubMember` still look as they did at the end of Phase 1/2. Add this new function directly below `reopenSession`:

```ts
export async function updateSessionNotes(sessionId: string, notes: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  await assertIsClubMember(session.clubId);

  await db.update(sessions).set({ notes }).where(eq(sessions.id, sessionId));
  revalidatePath(`/clubs/${session.clubId}/sessions/${sessionId}`);
}
```

No new imports are needed — `sessions`, `eq`, `revalidatePath`, and `assertIsClubMember` are all already imported/defined in this file.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Note on testing**

Like `reopenSession`/`endSession`, this calls `assertIsClubMember` → `auth()` internally, so it's not covered by `scripts/verify-data-layer.js` — matching the established, documented precedent for every other `auth()`-gated write in this domain. Its correctness is proven by real browser use once Task 4/7 wire it to the Notes editor.

- [ ] **Step 4: Commit**

```bash
git add src/app/lib/db/sessions-actions.ts
git commit -m "feat: add updateSessionNotes action for the notes editor"
```

---

### Task 3: Fix `addImageToSession`'s Route-Handler-incompatible redirect

**Files:**
- Modify: `src/app/lib/db/sessions.ts`

`next/navigation`'s `redirect()` is designed for Server Components and Server Actions — it works by throwing a special `NEXT_REDIRECT` error that Next.js's rendering machinery specifically catches and turns into an HTTP redirect. `addImageToSession` is called from `src/app/api/session/upload/route.ts`, a Route Handler, where no such machinery exists to catch that throw. Worse, the route's own `onUploadCompleted` wraps the call in a try/catch that rethrows *any* exception as a generic `"Could not update user"` error — so today, every single successful photo upload (the DB write already happened by the time `redirect()` runs) ends by reporting failure back to the client. This has been quietly wrong since the route was written; it's being fixed now because this phase is the first time anything actually exercises this path end-to-end.

- [ ] **Step 1: Remove the redirect call**

Read `src/app/lib/db/sessions.ts` first to confirm `addImageToSession`'s current shape. Change:

```ts
export async function addImageToSession(blobUri: string, sessionId: string, clubId: string) {
  // Constrained by clubId as well as sessionId: ...
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));
  if (!session) {
    throw new Error(`Session ${sessionId} not found in club ${clubId}`);
  }
  const currentImages = (session.imageUrls as string[] | null) ?? [];
  const updatedImages = [...currentImages, blobUri];

  await db
    .update(sessions)
    .set({ imageUrls: updatedImages })
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));

  revalidatePath("/sessions");
  redirect(`/sessions/?clubId=${clubId}`);
}
```

to:

```ts
export async function addImageToSession(blobUri: string, sessionId: string, clubId: string) {
  // Constrained by clubId as well as sessionId: ...
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));
  if (!session) {
    throw new Error(`Session ${sessionId} not found in club ${clubId}`);
  }
  const currentImages = (session.imageUrls as string[] | null) ?? [];
  const updatedImages = [...currentImages, blobUri];

  await db
    .update(sessions)
    .set({ imageUrls: updatedImages })
    .where(and(eq(sessions.id, sessionId), eq(sessions.clubId, clubId)));

  revalidatePath(`/clubs/${clubId}/sessions/${sessionId}`);
}
```

Leave the existing explanatory comment above the function (the one starting "Constrained by clubId as well as sessionId") exactly as it is — only the last two lines of the function body change. If `redirect` is no longer used anywhere else in this file after this change, remove its import too (check first — `getClubDetails`/`getAllActiveSessionDetails` etc. in this file's sibling `clubs.ts`/other files may have their own separate imports; only touch `sessions.ts`'s own import line, and only if `redirect` is now genuinely unused in `sessions.ts` specifically).

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/db/sessions.ts
git commit -m "fix: remove addImageToSession's non-functional redirect (Route Handlers can't use next/navigation's redirect)"
```

---

### Task 4: `SessionNotesEditor` client component

**Files:**
- Create: `src/app/ui/clubs/SessionNotesEditor.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useState } from "react";
import { updateSessionNotes } from "@/app/lib/db/sessions-actions";
import Button from "@/app/ui/ds/Button";

export interface SessionNotesEditorProps {
  sessionId: string;
  initialNotes: string;
}

export default function SessionNotesEditor({ sessionId, initialNotes }: SessionNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSessionNotes(sessionId, notes);
    } catch {
      setError("Couldn't save notes — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-5 pb-4">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
        placeholder="House rules, memorable moments..."
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" compact disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save notes"}
        </Button>
        {error && <p className="text-[12px] text-accent-700">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/clubs/SessionNotesEditor.tsx
git commit -m "feat: add SessionNotesEditor component"
```

---

### Task 5: `PhotoGrid` client component

**Files:**
- Create: `src/app/ui/clubs/PhotoGrid.tsx`

Reuses the existing `/api/session/upload` Route Handler and its `clientPayload` convention (a comma-joined `"sessionId,clubId"` string, parsed and trimmed on the server side — see `src/app/api/session/upload/route.ts`, unchanged by this phase). Depends on Task 3's fix (without it, every upload would report a false failure even though the image saved correctly).

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { ImagePlus } from "lucide-react";

export interface PhotoGridProps {
  sessionId: string;
  clubId: string;
  images: string[];
}

export default function PhotoGrid({ sessionId, clubId, images }: PhotoGridProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await upload(file.name, file, {
        access: "public",
        contentType: file.type,
        handleUploadUrl: "/api/session/upload",
        clientPayload: `${sessionId},${clubId}`,
      });
      router.refresh();
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 px-5 pb-4">
      {images.map((src, i) => (
        <div key={src} className="relative h-[110px] overflow-hidden border border-divider grayscale">
          <Image src={src} alt={`Session photo ${i + 1}`} fill className="object-cover" />
        </div>
      ))}
      <label className="flex h-[110px] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-divider text-text opacity-60">
        {uploading ? (
          <span className="text-[12px]">Uploading...</span>
        ) : (
          <>
            <ImagePlus size={20} strokeWidth={2} />
            <span className="text-[12px]">Add photo</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="col-span-2 text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

You don't have browser access. Confirm via `npm run build` succeeding (including that `next.config.js`'s existing `remotePatterns` entry for the Vercel Blob storage host still covers whatever URL shape `upload()` returns — it already does, since the pre-existing avatar/session-photo upload flow used the same store and the same `next/image` component before this phase). Note in your report that visual/interactive confirmation (drag or click to upload, thumbnail appears, grayscale filter renders) requires a real browser and is deferred to the human.

- [ ] **Step 4: Commit**

```bash
git add src/app/ui/clubs/PhotoGrid.tsx
git commit -m "feat: add PhotoGrid component for session photo uploads"
```

---

### Task 6: `FinishReopenButton` client component

**Files:**
- Create: `src/app/ui/clubs/FinishReopenButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endSession, reopenSession } from "@/app/lib/db/sessions-actions";
import Button from "@/app/ui/ds/Button";

export interface FinishReopenButtonProps {
  sessionId: string;
  active: boolean;
  notes: string;
}

export default function FinishReopenButton({ sessionId, active, notes }: FinishReopenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (active) {
          await endSession(sessionId, notes);
        } else {
          await reopenSession(sessionId);
        }
        router.refresh();
      } catch {
        setError("Something went wrong — try again.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" compact disabled={isPending} onClick={handleClick}>
        {active ? "Finish session" : "Reopen session"}
      </Button>
      {error && <p className="text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
```

`notes` is the session's already-persisted notes value at page-render time (not whatever's currently typed in an unsaved `SessionNotesEditor`) — `endSession`'s signature requires a notes argument, and since notes already save independently via Task 2's `updateSessionNotes`, this just re-persists the current value rather than risking overwriting a saved note with a stale one. This is a reversible toggle either way (per the design doc: "no confirmation"), so there's no destructive-action concern here.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/clubs/FinishReopenButton.tsx
git commit -m "feat: add FinishReopenButton component"
```

---

### Task 7: Session detail page

**Files:**
- Create: `src/app/clubs/[clubId]/sessions/[sessionId]/page.tsx`

**This page needs the membership check from the start** (same lesson as every `[clubId]`-scoped route from Phase 2 onward) — it is a directly-navigable route regardless of which screen links to it.

- [ ] **Step 1: Create the page**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { checkIfPlayerIsClubMember } from "@/app/lib/db/players";
import { getSessionDetails } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getSessionPlaySummaries } from "@/app/lib/db/results";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import Tag from "@/app/ui/ds/Tag";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import LinkButton from "@/app/ui/ds/LinkButton";
import SessionNotesEditor from "@/app/ui/clubs/SessionNotesEditor";
import PhotoGrid from "@/app/ui/clubs/PhotoGrid";
import FinishReopenButton from "@/app/ui/clubs/FinishReopenButton";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ clubId: string; sessionId: string }>;
}) {
  const { clubId, sessionId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const isMember = await checkIfPlayerIsClubMember(user.id, clubId);
  if (!isMember) redirect("/clubs");

  const [club, sessionRows, games, plays] = await Promise.all([
    getClubDetails(clubId),
    getSessionDetails(sessionId),
    getAllBoardgames(clubId),
    getSessionPlaySummaries(clubId, sessionId),
  ]);
  const session = sessionRows[0];
  if (!session) {
    redirect(`/clubs/${clubId}`);
  }

  const images = session.imageurl ? (JSON.parse(session.imageurl) as string[]) : [];

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title={session.name} eyebrow={club.name} />

      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="text-[12.5px] text-text opacity-60">{session.date.toLocaleDateString()}</p>
        <Tag variant={session.active ? "accent" : "neutral"}>{session.active ? "Active" : "Finished"}</Tag>
      </div>

      <div className="flex flex-1 flex-col">
        <SessionNotesEditor sessionId={sessionId} initialNotes={session.notes ?? ""} />
        <PhotoGrid sessionId={sessionId} clubId={clubId} images={images} />
        <div className="flex justify-end px-5 pb-2">
          <FinishReopenButton sessionId={sessionId} active={session.active} notes={session.notes ?? ""} />
        </div>

        <SectionHeader
          label="Results"
          action={
            games.length > 0 ? (
              <LinkButton href={`/add/result?sessionId=${sessionId}&clubId=${clubId}`} variant="primary" compact>
                Add result
              </LinkButton>
            ) : undefined
          }
        />
        {games.length === 0 ? (
          <div className="px-5 pb-6">
            <p className="text-[14px] text-text opacity-60">Add a game before recording results.</p>
            <div className="mt-3">
              <LinkButton href={`/clubs/${clubId}/games/new`} variant="secondary" compact>
                Add a game
              </LinkButton>
            </div>
          </div>
        ) : plays.length === 0 ? (
          <p className="px-5 pb-6 text-[14px] text-text opacity-60">No results recorded yet.</p>
        ) : (
          <div className="border-t border-divider pb-2">
            {plays.map((play) => (
              <div key={play.playId} className="flex gap-3 border-b border-divider px-5 py-3">
                <Trophy size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-accent" />
                <div className="flex-1">
                  <p className="text-[15.5px] font-semibold text-text">{play.gameName}</p>
                  <p className="text-[13px] text-text">{play.summary}</p>
                  <p className="text-[12px] text-text opacity-55">{play.detail}</p>
                  {play.notes && (
                    <p className="mt-2 border-l-2 border-accent bg-accent-100 px-2 py-1 text-[12.5px] text-text">
                      {play.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

"Add result" links to the OLD, untouched `/add/result?sessionId=...&clubId=...` page (still fully functional, old-styled) as a deliberate bridge — the redesigned Add/Edit Result screen is Phase 4 work. There is no "Edit" affordance on play rows in this phase, matching the design handoff's own "ghost pencil Edit button" only where an edit screen actually exists to link to — there isn't one yet (`updatePlayResults`, built in Phase 1, has no UI consumer until Phase 4 builds it).

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

You don't have browser access. Confirm via `npm run build` succeeding that all imports resolve. Note in your report that full interactive confirmation (notes save, photo upload, finish/reopen toggle, results list rendering correctly for each win condition) requires a real browser and is deferred to the human.

- [ ] **Step 4: Commit**

```bash
git add "src/app/clubs/[clubId]/sessions/[sessionId]/page.tsx"
git commit -m "feat: add Session detail screen"
```

---

### Task 8: Point every existing bridge link at the new Session Detail route

**Files:**
- Modify: `src/app/clubs/[clubId]/page.tsx`
- Modify: `src/app/sessions/page.tsx`
- Modify: `src/app/clubs/[clubId]/sessions/previous/page.tsx`
- Modify: `src/app/lib/db/sessions-actions.ts`

Every Phase 2 screen that links to a specific session currently points at the `sessions/previousSession` bridge page (`?sessionId=...&clubId=...`). Now that Task 7 built the real thing, point them at it instead.

- [ ] **Step 1: Club Detail's active-session rows**

In `src/app/clubs/[clubId]/page.tsx`, find the active-sessions `Link`:

```tsx
              href={`/sessions/previousSession?sessionId=${session.id}&clubId=${clubId}`}
```

Change to:

```tsx
              href={`/clubs/${clubId}/sessions/${session.id}`}
```

- [ ] **Step 2: Sessions tab rows**

In `src/app/sessions/page.tsx`, find:

```tsx
                href={`/sessions/previousSession?sessionId=${session.id}&clubId=${club.id}`}
```

Change to:

```tsx
                href={`/clubs/${club.id}/sessions/${session.id}`}
```

- [ ] **Step 3: Previous sessions list rows**

In `src/app/clubs/[clubId]/sessions/previous/page.tsx`, find:

```tsx
            href={`/sessions/previousSession?sessionId=${session.id}&clubId=${clubId}`}
```

Change to:

```tsx
            href={`/clubs/${clubId}/sessions/${session.id}`}
```

- [ ] **Step 4: `addNewGameSession`'s post-create redirect**

In `src/app/lib/db/sessions-actions.ts`, find the end of `addNewGameSession`:

```ts
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/sessions");
  redirect(`/sessions/previousSession?sessionId=${inserted.id}&clubId=${clubId}`);
```

Change the last line to:

```ts
  redirect(`/clubs/${clubId}/sessions/${inserted.id}`);
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 6: Grep for any remaining reference to the bridge page**

Run: `grep -rn "sessions/previousSession" src/app --include=*.tsx --include=*.ts`

Expected: no matches remain anywhere in `src/app` (the route file itself, `src/app/sessions/previousSession/page.tsx`, will still exist until Task 9 deletes it, but nothing should still be *linking* to it by this point).

- [ ] **Step 7: Commit**

```bash
git add "src/app/clubs/[clubId]/page.tsx" src/app/sessions/page.tsx "src/app/clubs/[clubId]/sessions/previous/page.tsx" src/app/lib/db/sessions-actions.ts
git commit -m "feat: point every session link at the new Session detail screen"
```

---

### Task 9: Delete the retired `sessions/previousSession` bridge page

**Files:** deletion only.

- [ ] **Step 1: Confirm nothing still references it**

Run: `grep -rn "previousSession" src/app --include=*.tsx --include=*.ts`

Expected: the only remaining hits should be inside `src/app/sessions/previousSession/page.tsx` itself (its own internal code, e.g. any self-referential comment) — if anything OUTSIDE that file still matches, STOP and report it rather than deleting.

- [ ] **Step 2: Delete it**

```bash
git rm -r src/app/sessions/previousSession/
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`

Expected: succeeds, and the `/sessions/previousSession` route no longer appears in the build output's route table.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete the retired sessions/previousSession bridge page"
```

---

### Task 10: Full verification pass

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

From a club detail page: open an active session → confirm the new Session Detail screen renders (not a 404, not the old bridge page) → toggle notes open, type something, save, reload, confirm it persisted → upload a photo, confirm it appears grayscale in the grid without a false error (this specifically exercises Task 3's fix) → click Finish session, confirm the tag flips to "Finished" and the button now reads "Reopen session" → click it again to confirm the reverse works → click "Add result" and confirm it opens the old-styled (but functional) `/add/result` page → go back and confirm the newly-added result now appears in the Results list with the correct summary/detail text for its win condition.

- [ ] **Step 3: Final review**

Confirm via `git log --oneline` that all of Task 1 through Task 9's commits are present, and via `git status` that the working tree is clean (aside from the pre-existing unrelated `yarn.lock`/scratch files noted in every prior phase).

---

## What the next phase picks up from here

Phase 4 builds the redesigned Add/Edit Result screen (retiring the `/add/result` bridge this phase still relies on, and finally giving `updatePlayResults` — built back in Phase 1 — a real UI consumer) and the real Club Stats screen (using `getClubStats`, also built in Phase 1, to replace the placeholder Phase 2 shipped). Once Add/Edit Result exists, Session Detail's play rows should gain the "Edit" pencil button the design calls for, linking to it with the play's id.

