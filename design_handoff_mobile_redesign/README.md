# Handoff: Tunnel Snakes Rule! — Mobile-First Redesign

## Overview
A mobile-first redesign of the board-game-club tracker (TunnelSnakesRule-V2, Next.js + Drizzle). It covers the core logged-in flow — create club → add game → create session → record result — plus login/logout, join-request approval, session notes/photos, finish/reopen session, result editing, previous-session browsing, club stats, and dark mode.

## About the Design Files
`Board Game Club - Mobile.dc.html` is a **design reference created in HTML** — an interactive prototype showing intended look and behavior, not production code. The task is to **recreate this design in the existing Next.js codebase** (App Router, Tailwind, server actions, Drizzle schema already present) using its established patterns. The prototype's in-memory state maps directly onto the existing DB schema (see State Management).

## Fidelity
**High-fidelity.** Recreate pixel-perfectly: exact colors, spacing, and typography below. The design follows the "Modernist" system: flat, zero border-radius everywhere, strong 2px rules, flush-left labels, Archivo for all type, grayscale photography.

## Design Tokens
Light theme:
- Background `#f3f2f2` · Surface (inputs) `#eae9e9` · Text `#201e1d`
- Accent `#ec3013` (single accent; use sparingly)
- Divider: `color-mix(in srgb, #201e1d 40%, transparent)`, drawn at 2px for section rules, 1px for row rules
- Neutral ramp: 100 `#f8f4f4`, 200 `#eae7e7`, 300 `#d7d3d3`, 400 `#bab6b6`, 500 `#9b9797`
- Accent ramp: 100 `#fff2ef`, 200 `#ffe0d9`, 300 `#ffc4b8`, 600 `#dd2b0f`, 700 `#ae1800`, 800 `#7c1405`, 900 `#4d170e`
- Accent-700 is used for small text/labels in red (contrast); accent base only for fills/icons/large text

Dark theme (token overrides, toggled via `data-theme="dark"` on `<html>`):
- Background `#1b1918` · page behind app `#141211` · Surface `#242120` · Text `#f0eeec`
- Divider: `color-mix(in srgb, #f0eeec 40%, transparent)`
- Neutral 100 `#2a2726`, 200 `#343130`, 300 `#454140`, 400 `#5d5958`
- Accent ramp flipped: 100 `#4d170e`, 200 `#7c1405`, 300 `#ae1800`, 600 `#ff7a61`, 700 `#ffc4b8`, 800 `#ffe0d9`

Type: Archivo everywhere (headings 600–700 weight). Scale used: 34px login title, 30px tab titles, 26px detail titles, 19px sub-screen titles, 15.5–17px list titles, 14–14.5px body/controls, 12–13px meta, 11px uppercase section labels (letter-spacing 0.1em).

Radius: **0px everywhere.** Icons: Lucide, 2px stroke, 13–20px.

Layout shell: app column max-width 430px, centered, 1px neutral-300 side borders, min-height 100dvh; content scrolls; bottom nav sticky at bottom. Screen padding: 20px horizontal; rows 11–18px vertical padding with 1px bottom rules; sections separated by 2px rules.

## Screens / Views

### 1. Login
- Vertically centered block, 24px side padding: 96×96 logo placeholder (2px divider border, accent Lucide `dices`-style icon 40px) — **real logo asset to be supplied later**; H1 "Tunnel Snakes Rule!" 34px/1.05 bold; tagline 14px at 65% opacity ("Log your club's sessions and keep a history of winners and losers.")
- Bottom: 2px top rule, full-width primary button "Log in" (accent fill, flush-left label), 48px bottom padding.
- In production this wraps the existing Clerk `SignInButton`.

### 2. Home — Clubs (tab)
- Header: kicker "BOARD GAME CLUBS" (11px uppercase, 55% opacity), title "Clubs" 30px bold; right side: ghost icon buttons for **log out** (`log-out` icon → login screen) and **dark-mode toggle** (`moon`/`sun`), then primary button "+ New club".
- Club rows: 44×44 accent square with white initial (Archivo bold 18px), name 17px semibold, meta "N members · N games" 12.5px 60% opacity, right chevron. 18px vertical padding, 1px rule.
- Empty state: "No clubs yet" 20px semibold, helper copy, primary "Create a club".

### 3. Sessions (tab)
- Kicker "ALL CLUBS", title "Sessions". Rows across all clubs: name, meta "Club · date · N results", `Active` accent tag when active, chevron → session detail.

### 4. Players (tab)
- Kicker "ALL CLUBS", title "Players". Rows: 38×38 accent-200 square with accent-800 initial, name 15px, neutral tag with club name.

### 5. New club
- Sub-screen header (back chevron + 19px bold title, 2px rule).
- Field "Club name" (label above, surface-filled input, 1px divider border).
- Helper: "You'll be the owner. Players request to join, and you approve them from the club page."
- Primary block "Create club" (disabled until name non-empty), ghost block "Cancel".

### 6. Club detail
- Back chevron row; header: 56×56 club photo upload slot (grayscale, owner-uploadable) + club name 26px bold + meta "N members · N games · N sessions"; right: secondary "Stats" button (bar-chart icon) → Club stats. 2px rule below.
- **Sessions** section: red 11px uppercase label + secondary "New session" (6/12px padding, 12.5px). Rows = active sessions only (name, meta "date · N results", Active tag, chevron). Empty: "No active sessions."
  - Below: collapsed row "Previous sessions (x)" (history icon, chevron) → Previous sessions screen. Hidden when x = 0.
- **Games** section (2px top rule): red label "Games (N)" + secondary "Add game". No game list (count only; future: links to game catalog). When 0: "No games yet — add one before recording results."
- **Members** section (2px top rule): rows with 34×34 accent-200 initial square, name, `Owner` neutral tag.
- **Join requests** section (2px top rule): red label + accent count tag. Rows: neutral-300 initial square, name, "Requested {when}" meta, secondary "Decline" + primary "Approve". Approve moves requester into members; decline removes. Empty: "No pending requests." (Matches existing joinRequests table/flow — no direct member-add.)

### 7. Add game
- Fields: "Game name" input; "How is it won?" — 5 custom radio rows (1px border boxes, 16px square indicator with 8px accent fill dot when selected):
  Leaderboard ("Everyone scores points"), Team based ("Teams compete, one team wins"), Co-operative ("Everyone wins or loses together"), Single winner ("One player wins"), Single loser ("One player loses").
- If Leaderboard: segmented control "High score wins / Low score wins" (maps to `scoring_direction`).
- Primary "Add game" (disabled until name + condition), ghost "Cancel".

### 8. New session
- Field "Session name", maxLength 25, char counter "N / 25" right-aligned in accent-700. **Default value = current date** (e.g. "Jul 23, 2026") so the user can create instantly or edit.
- Helper: "Dated today — {date}. The session stays active until you close it."
- Primary "Create session" → session detail (active).

### 9. Session detail
- Back chevron + club name breadcrumb (12.5px); title = session name 26px, date below; `Active` accent tag or `Finished` neutral tag.
- Action row: secondary "Notes" (toggles textarea, saves to session.notes), secondary "Photos" (toggles 2-up grid of 110px-tall grayscale drop slots → session.imageUrls), right-aligned ghost **"Finish session" / "Reopen session"** (toggles session.active — reversible).
- When notes exist and editor closed: note text shown at 75% opacity.
- **Results** section: red label + primary "Add result" (only when club has games). Play rows: accent trophy icon, game name 15.5px semibold, summary 13px (e.g. "Holly won · 11 pts"), detail 12px 55% opacity (e.g. "Holly 11 · Dan 9 · You 8"), optional play notes (12.5px, 2px accent left border, 8px pad), 56×56 grayscale photo slot per play, ghost pencil **Edit** button → Add result screen prefilled (replaces the play on save).
- If club has no games: helper + secondary "Add a game".

### 10. Add / Edit result
- Title "Add result" or "Edit result".
- "Game" native select (all club games) + outline tag showing win condition ("Leaderboard · high wins").
- "Who played?" — checkbox rows for every member (18px square, accent check when selected; all pre-selected).
- Condition-specific block (for selected players only):
  - **Leaderboard**: label "Scores — highest/lowest score wins"; per-player row with right-aligned 80px numeric input. Winner = best score by direction.
  - **Team based**: per-player A/B toggle pair (selected = accent fill, white text); segmented "Winning team: Team A / Team B".
  - **Co-operative**: segmented "Everyone won / The game won".
  - **Single winner/loser**: label "Who won?"/"Who lost?"; radio rows (accent border + dot when picked).
- "Notes (optional)" textarea → play.notes.
- Validation messages (13px accent-700): "Select at least one player." / "Enter a score for every player." / "Pick the winner/loser." Save disabled while invalid.
- Save: computes summary + detail strings (see prototype logic), appends or replaces play, returns to session.

### 11. Club stats
- Header "Club stats" + club-name subtitle.
- 2-cell stat grid (1px middle rule, 2px bottom rule): big 28px numbers for "Sessions" and "Results logged".
- "Most wins" leaderboard: rank number (45% opacity), accent-200 initial square, name, "N games played" meta, wins count right-aligned 17px bold accent-700. Sorted by wins desc, then games played. Win attribution per condition: leaderboard → best score; team → winning-team members; co-op → all players if won, none if lost; single winner → the picked player; single loser → everyone except the loser.
- Empty: "No results logged yet — stats will appear after the first game."

### 12. Previous sessions
- Header + club-name subtitle; rows of finished (active=false) sessions → session detail.

### Bottom nav (tabs only: Home/Clubs, Sessions, Players)
- Sticky bottom, 2px top rule, 3 equal grid columns. Icons: `house`, `dices`, `users` (20px); labels 10.5px 600 weight. Active tab = accent; inactive = text at 55% opacity. Hidden on all sub-screens (only on the 3 top-level tabs).

## Interactions & Behavior
- All navigation is instant screen swaps within the shell (in production: App Router routes).
- Buttons: DS states — primary hover `#dd2b0f`, active `#ae1800`; secondary/ghost hover = 7% text tint; focus ring 2px accent outline, 2px offset. Disabled = 45% opacity.
- Dark-mode toggle sets `data-theme="dark"` on `<html>`; persist per user (localStorage or profile).
- Finish/Reopen session is a single reversible toggle, no confirmation.
- Edit result rehydrates the full form from the play's stored raw result data.
- Touch targets ≥ 44px.

## State Management
Maps to the existing Drizzle schema:
- `clubs`, `club_members`, `join_requests` (approve = insert member + delete request; decline = delete request)
- `games` (`win_condition` enum, `scoring_direction` for leaderboard)
- `sessions` (`name`, `date`, `active`, `notes`, `image_urls`)
- `plays` (`session_id`, `game_id`, `notes`) + `leaderboard_results` (score per player), `team_results` (team, won), `outcome_results` (won) — the prototype's "raw" result object corresponds to these result tables; summary/detail strings should be derived at render time, not stored.
- Club photo + play/session photos: same upload route pattern as existing avatar/session upload API routes.

## Assets
- Icons: Lucide (inline SVG in prototype): plus, chevron-left/right, house, dices, users, trophy, pencil, bar-chart, history, log-out, moon, sun, dices (logo placeholder).
- Logo: placeholder only — final asset to be supplied by the team.
- Photos: all imagery renders grayscale (`filter: grayscale(1)` wrapper).
- Font: Archivo (Google Fonts), weights 400–700.

## Files
- `Board Game Club - Mobile.dc.html` — the full interactive prototype (all 12 screens + logic). Open in a browser; tweak panel offers darkMode / navLabels / emptyStart flags.
- `image-slot.js` — drag-drop image placeholder used by the prototype (design-time only; replace with real upload flow).
- `screenshots/` — reference captures of every screen (01-login through 13-home-dark-mode), light theme except the last.
