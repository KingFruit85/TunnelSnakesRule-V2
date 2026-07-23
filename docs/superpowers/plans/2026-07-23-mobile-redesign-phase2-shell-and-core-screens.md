# Mobile Redesign — Phase 2: Shell & Core Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bottom-tab shell and the first group of redesigned screens — Login, Clubs tab, New club, Club detail, Sessions tab, Players tab, New session, Add game, Previous sessions list, and a Club stats placeholder — replacing the old TopNav/query-param routing with the new nested `/clubs/[clubId]/...` structure described in the design handoff.

**Architecture:** A small reusable design-system component library (`src/app/ui/ds/`) implements the tokens Phase 1 laid down (Tailwind `canvas`/`surface`/`text`/`divider`/`accent`/`muted` colors, zero radius, Archivo) as Button/Tag/InitialSquare/SectionHeader/etc. primitives, used by every new screen. Routes live under a clean `/clubs/[clubId]/...` tree; `/sessions` and `/players` are rewritten in place as cross-club tabs. Two screens are deliberately **not** built this phase — full Session Detail (notes/photos/finish-reopen/results) and the real Club Stats aggregation UI — because they're the two most complex remaining pieces and belong in their own phase. Every link this phase creates that would otherwise point at one of those two screens instead bridges to an existing, still-functional old-style page (`/sessions/previousSession?sessionId=...&clubId=...`, which is self-contained and unaffected by anything this phase touches) or, for stats, a small styled "coming soon" placeholder — so nothing is ever a dead link. Old routes/components this phase fully supersedes (New club, Add game, New session, join-request review) are deleted in a dedicated cleanup task once their replacements are verified working, not left as dead code.

**Tech Stack:** Next.js 15 App Router (Server Components by default, `"use client"` only where state/hooks are needed), Drizzle ORM, Clerk auth, Tailwind CSS with the Phase 1 token system, `lucide-react` icons, `next-themes` for the dark-mode toggle. No test framework exists in this repo for UI code — verification is `npm run build` plus the manual click-through notes in each task (this mirrors how Phase 1 handled its own UI-adjacent, non-logic changes).

**Explicitly out of scope for this phase (left as pre-existing, untouched):** `/join/club` (browse-and-request-to-join flow) has no equivalent screen anywhere in the 12-screen design handoff — it's a real, load-bearing feature (it's the only way `requestAccessToClub` ever gets called) with no redesigned replacement yet, so it is **not deleted or modified**, just left reachable at its current URL. `/add/player`, `/add/result`, `/add/session/upload` are similarly left untouched (the first is dev/test scaffolding disconnected from Clerk identity, not part of the design doc at all; the latter two are the Phase 3 territory — Add/Edit Result and photo upload — and still work exactly as they did before). Flag both of these to the user in the final summary; they are known gaps, not oversights.

---

## Route map this phase produces

```
src/app/
  page.tsx                          Login (redirects to /clubs if signed in)
  clubs/
    page.tsx                        Clubs tab (Home)
    new/page.tsx                    New club
    [clubId]/
      page.tsx                      Club detail
      stats/page.tsx                Club stats (placeholder)
      games/new/page.tsx            Add game
      sessions/
        new/page.tsx                New session
        previous/page.tsx           Previous sessions list
  sessions/page.tsx                 Sessions tab (rewritten in place; cross-club)
  sessions/previousSession/page.tsx  UNCHANGED — kept alive as the Session Detail bridge
  players/page.tsx                  Players tab (rewritten in place; cross-club)
```

---

### Task 1: Design-system primitives

**Files:**
- Create: `src/app/ui/ds/buttonStyles.ts`
- Create: `src/app/ui/ds/Button.tsx`
- Create: `src/app/ui/ds/SubmitButton.tsx`
- Create: `src/app/ui/ds/LinkButton.tsx`
- Create: `src/app/ui/ds/Tag.tsx`
- Create: `src/app/ui/ds/InitialSquare.tsx`
- Create: `src/app/ui/ds/SectionHeader.tsx`
- Create: `src/app/ui/ds/EmptyState.tsx`
- Create: `src/app/ui/ds/IconButton.tsx`

These are the shared building blocks every screen in this phase (and later phases) composes from, matching the design handoff's own component table (`.btn`/`.tag`/section labels/etc.) translated into Tailwind classes against the Phase 1 token system (`bg-canvas`, `bg-surface`, `text-text`, `border-divider`, `bg-accent`/`text-accent-700`/etc., `bg-muted-*`). None of these need `"use client"` except `SubmitButton` (uses `useFormStatus`) and `IconButton` is left as a plain component (its `onClick` is supplied by whatever client component renders it).

- [ ] **Step 1: `buttonStyles.ts` — the shared class-building helper**

```ts
// src/app/ui/ds/buttonStyles.ts
export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "bg-canvas text-text border border-divider hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
  ghost:
    "bg-transparent text-text hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
};

export function buttonClasses({
  variant = "primary",
  block = false,
  compact = false,
  className = "",
}: ButtonStyleOptions = {}) {
  const sizing = compact ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-3 text-[14.5px]";
  // block/inline-block and text-center/text-left are each mutually exclusive
  // pairs chosen together here (never listed as two separate conditional
  // classes) - two Tailwind utility classes with equal specificity both
  // setting the same CSS property (e.g. both "block" and "inline-block"
  // present at once) resolve by whichever Tailwind happens to emit later in
  // its compiled stylesheet, not by order in the class attribute, so mixing
  // both is a real bug, not a style choice.
  const layout = block ? "block w-full text-center" : "inline-block text-left";
  return [
    layout,
    "font-archivo font-semibold transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    sizing,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
```

Note: `block` variants get `text-center` even though the design doc calls for flush-left labels on wide buttons — re-read the doc's own qualifier: "flush-left label" applies to buttons where the label sits at the padding edge rather than centered when there's a leading/trailing icon; for simple full-width text-only CTAs ("Log in", "Create club", "Create session", "Add game") centering reads correctly against the screenshots (`06-new-session.png`, `05-add-game.png` both show centered white text on the primary block button). Ghost/secondary block buttons ("Cancel") are also centered in those same screenshots. This matches what's actually in the reference screenshots, not a literal misreading of the prose.

- [ ] **Step 2: `Button.tsx` — plain button (no hooks, usable from Server or Client components)**

```tsx
// src/app/ui/ds/Button.tsx
import { ButtonHTMLAttributes } from "react";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
}

export default function Button({
  variant,
  block,
  compact,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, block, compact, className })} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: `SubmitButton.tsx` — form-submit button with pending state**

```tsx
// src/app/ui/ds/SubmitButton.tsx
"use client";
import { useFormStatus } from "react-dom";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface SubmitButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export default function SubmitButton({
  children,
  variant,
  block,
  compact,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={buttonClasses({ variant, block, compact })}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: `LinkButton.tsx` — button-styled navigation link**

```tsx
// src/app/ui/ds/LinkButton.tsx
import Link from "next/link";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LinkButton({
  href,
  children,
  variant,
  block,
  compact,
  className,
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, block, compact, className })}>
      {children}
    </Link>
  );
}
```

- [ ] **Step 5: `Tag.tsx`**

```tsx
// src/app/ui/ds/Tag.tsx
export type TagVariant = "accent" | "neutral" | "outline";

const VARIANT_CLASSES: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-700",
  neutral: "bg-muted-200 text-text",
  outline: "border border-accent-700 text-accent-700",
};

export interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

export default function Tag({ children, variant = "neutral", className = "" }: TagProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 6: `InitialSquare.tsx`**

```tsx
// src/app/ui/ds/InitialSquare.tsx
export type InitialSquareVariant = "accent" | "accentTint" | "neutral";

const VARIANT_CLASSES: Record<InitialSquareVariant, string> = {
  accent: "bg-accent text-white",
  accentTint: "bg-accent-200 text-accent-800",
  neutral: "bg-muted-300 text-text",
};

export interface InitialSquareProps {
  label: string;
  size?: number;
  variant?: InitialSquareVariant;
}

export default function InitialSquare({ label, size = 44, variant = "accent" }: InitialSquareProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-archivo font-bold ${VARIANT_CLASSES[variant]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </span>
  );
}
```

- [ ] **Step 7: `SectionHeader.tsx`**

```tsx
// src/app/ui/ds/SectionHeader.tsx
export interface SectionHeaderProps {
  label: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ label, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-t-2 border-divider px-5 pt-4 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">{label}</span>
      {action}
    </div>
  );
}
```

- [ ] **Step 8: `EmptyState.tsx`**

```tsx
// src/app/ui/ds/EmptyState.tsx
export interface EmptyStateProps {
  title: string;
  helper?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, helper, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="text-[20px] font-semibold text-text">{title}</p>
      {helper && <p className="text-[14px] text-text opacity-65">{helper}</p>}
      {action}
    </div>
  );
}
```

- [ ] **Step 9: `IconButton.tsx`**

```tsx
// src/app/ui/ds/IconButton.tsx
import { ButtonHTMLAttributes } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

export default function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center p-2 text-text transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 10: Verify the build**

Run: `npm run build`

Expected: succeeds. None of these files are imported anywhere yet, so this only proves they type-check and don't break the build in isolation.

- [ ] **Step 11: Commit**

```bash
git add src/app/ui/ds/
git commit -m "feat: add design-system primitives for the mobile redesign screens"
```

---

### Task 2: App shell, bottom nav, back header, theme toggle — and remove the old TopNav

**Files:**
- Create: `src/app/ui/ds/AppShell.tsx`
- Create: `src/app/ui/ds/BottomNav.tsx`
- Create: `src/app/ui/ds/BackHeader.tsx`
- Create: `src/app/ui/ds/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/sessions/layout.tsx`

`AppShell` is a plain component (not a Next.js `layout.tsx`) that every page in this phase imports directly and composes explicitly — it is **not** wired up as a route-level layout, because the bottom nav must appear on exactly the 3 tab screens (`/clubs`, `/sessions`, `/players`) and nowhere else, and a shared Next.js layout under `/clubs` would apply to every nested sub-screen too (`/clubs/[clubId]`, `/clubs/new`, etc.), which is wrong per the design doc ("Hidden on all sub-screens"). So each tab page renders `<AppShell>...<BottomNav /></AppShell>`, and each sub-screen renders `<AppShell>...</AppShell>` without it.

- [ ] **Step 1: `AppShell.tsx`**

```tsx
// src/app/ui/ds/AppShell.tsx
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas-page">
      <div className="flex min-h-dvh w-full max-w-[430px] flex-col border-x border-muted-300 bg-canvas">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `BackHeader.tsx`**

```tsx
// src/app/ui/ds/BackHeader.tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface BackHeaderProps {
  href: string;
  title: string;
  eyebrow?: string;
}

export default function BackHeader({ href, title, eyebrow }: BackHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-divider px-5 py-4">
      <Link href={href} aria-label="Back" className="flex items-center justify-center">
        <ChevronLeft size={20} strokeWidth={2} className="text-accent" />
      </Link>
      <div className="flex flex-col">
        {eyebrow && <span className="text-[12.5px] text-text opacity-65">{eyebrow}</span>}
        <span className="text-[19px] font-bold text-text">{title}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `BottomNav.tsx`**

```tsx
// src/app/ui/ds/BottomNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Dices, Users } from "lucide-react";

const TABS = [
  { href: "/clubs", label: "Home", Icon: House },
  { href: "/sessions", label: "Sessions", Icon: Dices },
  { href: "/players", label: "Players", Icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 grid grid-cols-3 border-t-2 border-divider bg-canvas">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-[3px] py-2.5 ${
              active ? "text-accent" : "text-text opacity-55"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-[10.5px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: `ThemeToggle.tsx`**

```tsx
// src/app/ui/ds/ThemeToggle.tsx
"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import IconButton from "./IconButton";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // resolvedTheme is undefined on first server render; rendering nothing
    // themed until mount avoids a hydration mismatch, same reasoning as
    // next-themes' own suppressHydrationWarning usage in the root layout.
    return <span className="block h-9 w-9" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <IconButton
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </IconButton>
  );
}
```

- [ ] **Step 5: Remove TopNav from the root layout**

Replace the full contents of `src/app/layout.tsx` (this is the file Phase 1 left in place — read it first to confirm it matches, then replace):

```tsx
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import "./globals.css";

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
            {children}
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
```

What changed from Phase 1's version: the `TopNav` import and its `<Suspense>` wrapper are removed (Suspense was only ever wrapping `TopNav` — nothing else needs it here). `ThemeProvider` now wraps `{children}` directly instead of `{children}` plus a `TopNav`. Do **not** delete `src/app/ui/sessions/topNav.tsx` itself in this step — `src/app/add/layout.tsx` still imports and renders it independently for the old `/add/player`, `/add/result`, `/add/session/upload` bridge routes this phase deliberately leaves untouched. Only this one import site is being removed.

- [ ] **Step 6: Strip the redundant TopNav from `sessions/layout.tsx`**

`src/app/sessions/layout.tsx` currently renders its own separate copy of `TopNav` (a pre-existing redundancy — both the root layout and this nested layout rendered it). This layout wraps both the new Sessions tab (`sessions/page.tsx`, rewritten in Task 6 below) and the untouched bridge page (`sessions/previousSession/page.tsx`) — since the new Sessions tab uses `AppShell`/`BottomNav` instead, the old TopNav needs to come out here too. Replace the full contents of `src/app/sessions/layout.tsx`:

```tsx
import { Analytics } from "@vercel/analytics/react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-col">
      <div>{children}</div>
      <Analytics />
    </div>
  );
}
```

This means `sessions/previousSession` (the Session Detail bridge page) loses its top nav chrome as a minor, acceptable transitional rough edge — it's a temporary bridge destined for replacement by the real Session Detail screen in the next phase, and the page remains fully functional (it has its own in-page link back to the club, and browser-back always works).

- [ ] **Step 7: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 8: Manual check**

Run `npm run dev`. Visit `/add/result` (or any other still-untouched `/add/*` route) directly and confirm the old TopNav still renders there (proving `add/layout.tsx`'s independent import still works). Visit `/` and confirm no TopNav renders at the root level anymore (the page content itself hasn't changed yet — that's Task 3 — but there should be no top nav bar above it).

- [ ] **Step 9: Commit**

```bash
git add src/app/ui/ds/AppShell.tsx src/app/ui/ds/BottomNav.tsx src/app/ui/ds/BackHeader.tsx src/app/ui/ds/ThemeToggle.tsx src/app/layout.tsx src/app/sessions/layout.tsx
git commit -m "feat: add app shell, bottom nav, and theme toggle; remove TopNav from root/sessions layouts"
```

---

### Task 3: Login screen

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the full contents of `src/app/page.tsx`**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Dices } from "lucide-react";
import { checkIfUserHasPlayerProfile, createNewPlayerRecord } from "./lib/db/players";
import AppShell from "./ui/ds/AppShell";
import { buttonClasses } from "./ui/ds/buttonStyles";

export default async function LoginPage() {
  const user = await currentUser();

  if (user) {
    const hasProfile = await checkIfUserHasPlayerProfile(user.id);
    if (!hasProfile) {
      await createNewPlayerRecord(user);
    }
    redirect("/clubs");
  }

  return (
    <AppShell>
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="flex h-24 w-24 items-center justify-center border-2 border-divider">
          <Dices size={40} strokeWidth={2} className="text-accent" />
        </div>
        <h1 className="mt-6 text-[34px] font-bold leading-[1.05] text-text">Tunnel Snakes Rule!</h1>
        <p className="mt-3 text-[14px] text-text opacity-65">
          Log your club&apos;s sessions and keep a history of winners and losers.
        </p>
      </div>
      <div className="border-t-2 border-divider px-6 pb-12 pt-5">
        <SignInButton mode="modal">
          <button className={buttonClasses({ block: true })}>Log in</button>
        </SignInButton>
      </div>
    </AppShell>
  );
}
```

This preserves the exact logic Phase 1 documented for player-profile bootstrapping (`checkIfUserHasPlayerProfile`/`createNewPlayerRecord`, unchanged) — only the JSX and the post-login destination changed (old code rendered `UserClubs` inline; new code redirects to `/clubs`, built in Task 4).

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

Run `npm run dev`. Visit `/` signed out — confirm the login screen renders with the dice icon, title, tagline, and a "Log in" button that opens Clerk's sign-in modal. This screen will redirect to `/clubs` on sign-in, which doesn't exist until Task 4 lands — a 404 here until then is expected mid-phase, not a regression (nothing else links to `/clubs` yet either).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rebuild login screen against the design system"
```

---

### Task 4: Clubs tab (Home)

**Files:**
- Create: `src/app/clubs/page.tsx`

- [ ] **Step 1: Create `src/app/clubs/page.tsx`**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronRight } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import ThemeToggle from "@/app/ui/ds/ThemeToggle";
import IconButton from "@/app/ui/ds/IconButton";
import LinkButton from "@/app/ui/ds/LinkButton";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function ClubsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const clubs = await getUsersClubs(user.id);
  const rows = await Promise.all(
    clubs.map(async (club) => {
      const [members, games] = await Promise.all([
        getAllPlayersInClub(club.id),
        getAllBoardgames(club.id),
      ]);
      return { club, memberCount: members.length, gameCount: games.length };
    })
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">
            Board game clubs
          </p>
          <h1 className="text-[30px] font-bold text-text">Clubs</h1>
        </div>
        <div className="flex items-center gap-1">
          <SignOutButton redirectUrl="/">
            <IconButton aria-label="Log out">
              <LogOut size={20} strokeWidth={2} />
            </IconButton>
          </SignOutButton>
          <ThemeToggle />
        </div>
      </div>

      <div className="px-5 pt-4">
        <LinkButton href="/clubs/new" block>
          + New club
        </LinkButton>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState
            title="No clubs yet"
            helper="Create a club to start logging sessions."
            action={
              <LinkButton href="/clubs/new" variant="primary">
                Create a club
              </LinkButton>
            }
          />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ club, memberCount, gameCount }) => (
              <Link
                key={club.id}
                href={`/clubs/${club.id}`}
                className="flex items-center gap-3 border-b border-divider px-5 py-[18px]"
              >
                <InitialSquare label={club.name} size={44} />
                <div className="flex-1">
                  <p className="text-[17px] font-semibold text-text">{club.name}</p>
                  <p className="text-[12.5px] text-text opacity-60">
                    {memberCount} {memberCount === 1 ? "member" : "members"} · {gameCount}{" "}
                    {gameCount === 1 ? "game" : "games"}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={2} className="text-text opacity-45" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
```

`SignOutButton`'s `redirectUrl="/"` matches the design doc's "log out → login screen" behavior exactly.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

Run `npm run dev`, sign in, and confirm `/` redirects to `/clubs`, showing your clubs (or the empty state if you have none), with working log-out and theme-toggle buttons in the header and a bottom nav with Home/Sessions/Players tabs (Sessions/Players tabs will 404 until Tasks 6/7 land — expected mid-phase). Clicking a club row will 404 until Task 8 (Club detail) lands — also expected mid-phase.

- [ ] **Step 4: Commit**

```bash
git add src/app/clubs/page.tsx
git commit -m "feat: add Clubs tab (home screen)"
```

---

### Task 5: New club screen

**Files:**
- Modify: `src/app/lib/db/clubs-actions.ts`
- Create: `src/app/ui/clubs/NewClubForm.tsx`
- Create: `src/app/clubs/new/page.tsx`

`addNewClub` currently redirects to `/` (the old home page). It needs to redirect to the new club's own detail page instead, matching the design doc ("Create club" → club detail) and this phase's route structure.

- [ ] **Step 1: Update `addNewClub`'s redirect target**

In `src/app/lib/db/clubs-actions.ts`, change:

```ts
  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId })
    .returning();

  await addPlayerToClub(userId, insertedClub.id);

  revalidatePath("/join/club");
  redirect("/");
```

to:

```ts
  const [insertedClub] = await db
    .insert(clubs)
    .values({ name, ownerId })
    .returning();

  await addPlayerToClub(userId, insertedClub.id);

  revalidatePath("/join/club");
  revalidatePath("/clubs");
  redirect(`/clubs/${insertedClub.id}`);
```

The `revalidatePath("/join/club")` call is left exactly as-is — it's still doing its original job of refreshing *other* users' "available clubs to join" view (that page is untouched this phase), not the creator's own view. The new `revalidatePath("/clubs")` line is added for the creator's own Clubs tab.

- [ ] **Step 2: Create `src/app/ui/clubs/NewClubForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { addNewClub } from "@/app/lib/db/clubs-actions";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

export default function NewClubForm() {
  const [name, setName] = useState("");

  return (
    <form action={addNewClub} className="flex flex-1 flex-col px-5 pt-5">
      <label className="text-[14px] font-medium text-text" htmlFor="clubName">
        Club name
      </label>
      <input
        id="clubName"
        name="clubName"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />
      <p className="mt-3 text-[13px] text-text opacity-65">
        You&apos;ll be the owner. Players request to join, and you approve them from the club page.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block disabled={name.trim().length === 0}>
          Create club
        </SubmitButton>
        <LinkButton href="/clubs" variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/clubs/new/page.tsx`**

```tsx
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewClubForm from "@/app/ui/clubs/NewClubForm";

export default function NewClubPage() {
  return (
    <AppShell>
      <BackHeader href="/clubs" title="New club" />
      <NewClubForm />
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 5: Manual check**

From `/clubs`, click "+ New club", fill in a name (confirm the submit button is disabled until you do), submit, and confirm you land on `/clubs/<new-id>` (a 404 until Task 8 lands — expected mid-phase) and that the club now appears back on `/clubs` if you navigate there.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/clubs-actions.ts src/app/ui/clubs/NewClubForm.tsx src/app/clubs/new/page.tsx
git commit -m "feat: add New club screen"
```

---

### Task 6: Sessions tab

**Files:**
- Modify: `src/app/sessions/page.tsx`

This fully replaces the old query-param-scoped `/sessions?clubId=` page with the new cross-club tab. The old page's actual functionality (create session inline, view/finish an active session, browse previous sessions for one club) is superseded by Task 7 (New session), the untouched `sessions/previousSession` bridge, and Task 11 (Previous sessions list) respectively — none of it is lost, it's relocated.

- [ ] **Step 1: Replace the full contents of `src/app/sessions/page.tsx`**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllActiveSessionDetails, getAllInactiveSessions } from "@/app/lib/db/sessions";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import Tag from "@/app/ui/ds/Tag";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function SessionsTabPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const clubs = await getUsersClubs(user.id);
  const perClub = await Promise.all(
    clubs.map(async (club) => {
      const [active, previous] = await Promise.all([
        getAllActiveSessionDetails(club.id),
        getAllInactiveSessions(club.id),
      ]);
      return [...active, ...previous].map((session) => ({ session, club }));
    })
  );
  const rows = perClub.flat().sort((a, b) => b.session.date.getTime() - a.session.date.getTime());

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Sessions</h1>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="No sessions yet" helper="Sessions you record will show up here." />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ session, club }) => (
              <Link
                key={session.id}
                href={`/sessions/previousSession?sessionId=${session.id}&clubId=${club.id}`}
                className="flex items-center gap-3 border-b border-divider px-5 py-[15px]"
              >
                <div className="flex-1">
                  <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
                  <p className="text-[12.5px] text-text opacity-60">
                    {club.name} · {session.date.toLocaleDateString()} · {session.winners.length}{" "}
                    {session.winners.length === 1 ? "result" : "results"}
                  </p>
                </div>
                {session.active && <Tag variant="accent">Active</Tag>}
                <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
```

`session.winners.length` is used for the "N results" count — `GameSession.winners` has exactly one entry per play (see `toGameSession` in `sessions.ts`: `winners = await Promise.all(sessionPlays.map(p => getEventWinner(p.id)))`), which is what "N results" means in the design doc (number of plays recorded, not number of individual player-result rows).

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

Visit `/sessions` — confirm it shows every session across all your clubs, newest first, with the club name in the meta line and an "Active" tag on active sessions. Clicking a row should open the (old-styled) session detail bridge page.

- [ ] **Step 4: Commit**

```bash
git add src/app/sessions/page.tsx
git commit -m "feat: rebuild Sessions tab as a cross-club list"
```

---

### Task 7: Players tab

**Files:**
- Modify: `src/app/players/page.tsx`

The old `src/app/players/page.tsx` showed a single player's detail (`?userid=` query param, `getPlayerById` + a games-played table via `@geist-ui/core`'s `Table`) — there is no "all players across all clubs" list anywhere in the old app, and no per-player detail screen anywhere in the 12-screen design doc either. This fully replaces the route's content and purpose; nothing in this phase's new nav ever produces a `?userid=` link, so no link becomes dead by this change.

- [ ] **Step 1: Replace the full contents of `src/app/players/page.tsx`**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUsersClubs } from "@/app/lib/db/clubs";
import { getAllPlayersInClub } from "@/app/lib/db/sessions";
import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Tag from "@/app/ui/ds/Tag";
import EmptyState from "@/app/ui/ds/EmptyState";

export default async function PlayersTabPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const clubs = await getUsersClubs(user.id);
  const perClub = await Promise.all(
    clubs.map(async (club) => {
      const members = await getAllPlayersInClub(club.id);
      return members.map((player) => ({ player, club }));
    })
  );
  const rows = perClub.flat();

  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Players</h1>
      </div>

      <div className="flex-1">
        {rows.length === 0 ? (
          <EmptyState title="No players yet" helper="Players will show up here once your clubs have members." />
        ) : (
          <div className="mt-4 border-t-2 border-divider">
            {rows.map(({ player, club }) => (
              <div
                key={`${club.id}-${player.id}`}
                className="flex items-center gap-3 border-b border-divider px-5 py-3"
              >
                <InitialSquare label={player.name} size={38} variant="accentTint" />
                <span className="flex-1 text-[15px] text-text">{player.name}</span>
                <Tag variant="neutral">{club.name}</Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
```

Rows are intentionally not links — the design doc's Players tab section (#4) describes name/initial/club-tag rows with no chevron and no stated navigation target, unlike every other list screen in the doc which explicitly says "→ [screen]".

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

Visit `/players` — confirm it lists every member across every club you're in, each tagged with their club's name. If you're in more than one club with overlapping members, the same player should appear once per club membership (by design — each row represents a specific membership, not a deduplicated person).

- [ ] **Step 4: Commit**

```bash
git add src/app/players/page.tsx
git commit -m "feat: rebuild Players tab as a cross-club list"
```

---

### Task 8: Club detail screen

**Files:**
- Modify: `src/app/lib/db/players.ts`
- Create: `src/app/ui/clubs/JoinRequestRow.tsx`
- Create: `src/app/clubs/[clubId]/page.tsx`

This is the most complex screen this phase: header with photo/name/meta/Stats button, Sessions section (active rows + collapsed previous-count row), Games section (count only, per spec — no game list), Members section with an Owner tag, and Join requests with working Approve/Decline.

- [ ] **Step 1: Extend `getAllAcessRequests` to include the request timestamp**

The design doc's join-request rows show "Requested {when}" — the current `getAllAcessRequests` in `src/app/lib/db/players.ts` only returns `Player[]`, dropping `joinRequests.requestedAt`. Its only caller today is `src/app/requests/page.tsx`, which Task 13 (cleanup) deletes — so widening its return shape is safe with no other caller to update. Change:

```ts
export async function getAllAcessRequests(clubId: string): Promise<Player[]> {
  const rows = await db
    .select({ player: players })
    .from(joinRequests)
    .innerJoin(players, eq(joinRequests.playerId, players.id))
    .where(eq(joinRequests.clubId, clubId));

  return rows.map((row) => toPlayer(row.player));
}
```

to:

```ts
export type AccessRequest = {
  player: Player;
  requestedAt: Date;
};

export async function getAllAcessRequests(clubId: string): Promise<AccessRequest[]> {
  const rows = await db
    .select({ player: players, requestedAt: joinRequests.requestedAt })
    .from(joinRequests)
    .innerJoin(players, eq(joinRequests.playerId, players.id))
    .where(eq(joinRequests.clubId, clubId));

  return rows.map((row) => ({ player: toPlayer(row.player), requestedAt: row.requestedAt }));
}
```

- [ ] **Step 2: Create `src/app/ui/clubs/JoinRequestRow.tsx`**

```tsx
"use client";
import { useState, useTransition } from "react";
import { addPlayerToClub, declineAccessRequest } from "@/app/lib/db/players-actions";
import { Player } from "@/app/lib/definitions";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Button from "@/app/ui/ds/Button";

function formatRelativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export interface JoinRequestRowProps {
  player: Player;
  clubId: string;
  requestedAt: Date;
}

export default function JoinRequestRow({ player, clubId, requestedAt }: JoinRequestRowProps) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  return (
    <div className="flex items-center gap-3 border-b border-divider px-5 py-3">
      <InitialSquare label={player.name} size={34} variant="neutral" />
      <div className="flex-1">
        <p className="text-[14px] font-medium text-text">{player.name}</p>
        <p className="text-[12px] text-text opacity-55">Requested {formatRelativeTime(requestedAt)}</p>
      </div>
      <Button
        variant="secondary"
        compact
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await declineAccessRequest(player.externalId, clubId);
            setResolved(true);
          })
        }
      >
        Decline
      </Button>
      <Button
        variant="primary"
        compact
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await addPlayerToClub(player.externalId, clubId);
            setResolved(true);
          })
        }
      >
        Approve
      </Button>
    </div>
  );
}
```

`addPlayerToClub`/`declineAccessRequest` are called directly as functions (not via a `<form action>`) — both are exported from `players-actions.ts`'s `"use server"` module, so this is a valid direct Server Action call, matching the exact pattern the old (now-deleted-in-Task-13) `clubAccessRequests.tsx` already used for the same two functions.

- [ ] **Step 3: Update the two actions' `revalidatePath` target**

In `src/app/lib/db/players-actions.ts`, both `addPlayerToClub` and `declineAccessRequest` currently end with `revalidatePath("/requests")` (the old, soon-to-be-deleted page). Change both occurrences to `revalidatePath(`/clubs/${clubId}`)` so approving/declining refreshes the Club Detail page that now owns this UI:

```ts
export async function addPlayerToClub(playerExternalId: string, clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  await assertIsClubOwner(clubId, userId);
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db.insert(clubMembers).values({ playerId: player.id, clubId });
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath(`/clubs/${clubId}`);
}

export async function declineAccessRequest(playerExternalId: string, clubId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  await assertIsClubOwner(clubId, userId);
  const player = await resolvePlayerByExternalId(playerExternalId);
  await db
    .delete(joinRequests)
    .where(and(eq(joinRequests.playerId, player.id), eq(joinRequests.clubId, clubId)));
  revalidatePath(`/clubs/${clubId}`);
}
```

- [ ] **Step 4: Create `src/app/clubs/[clubId]/page.tsx`**

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, BarChart, History } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { getAllPlayersInClub, getAllActiveSessionDetails, getAllInactiveSessions } from "@/app/lib/db/sessions";
import { getAllBoardgames } from "@/app/lib/db/games";
import { getAllAcessRequests } from "@/app/lib/db/players";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Tag from "@/app/ui/ds/Tag";
import LinkButton from "@/app/ui/ds/LinkButton";
import JoinRequestRow from "@/app/ui/clubs/JoinRequestRow";

export default async function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const [club, members, games, activeSessions, previousSessions, requests] = await Promise.all([
    getClubDetails(clubId),
    getAllPlayersInClub(clubId),
    getAllBoardgames(clubId),
    getAllActiveSessionDetails(clubId),
    getAllInactiveSessions(clubId),
    getAllAcessRequests(clubId),
  ]);
  const totalSessions = activeSessions.length + previousSessions.length;

  return (
    <AppShell>
      <BackHeader href="/clubs" title={club.name} />

      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <InitialSquare label={club.name} size={56} />
          <div>
            <p className="text-[26px] font-bold leading-tight text-text">{club.name}</p>
            <p className="text-[12.5px] text-text opacity-60">
              {members.length} {members.length === 1 ? "member" : "members"} · {games.length}{" "}
              {games.length === 1 ? "game" : "games"} · {totalSessions}{" "}
              {totalSessions === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>
        <LinkButton href={`/clubs/${clubId}/stats`} variant="secondary" compact>
          <span className="flex items-center gap-1.5">
            <BarChart size={14} strokeWidth={2} />
            Stats
          </span>
        </LinkButton>
      </div>

      <SectionHeader
        label="Sessions"
        action={
          <LinkButton href={`/clubs/${clubId}/sessions/new`} variant="secondary" compact>
            New session
          </LinkButton>
        }
      />
      {activeSessions.length === 0 ? (
        <p className="px-5 pb-2 text-[14px] text-text opacity-60">No active sessions.</p>
      ) : (
        <div className="border-t border-divider">
          {activeSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/previousSession?sessionId=${session.id}&clubId=${clubId}`}
              className="flex items-center gap-3 border-b border-divider px-5 py-3"
            >
              <div className="flex-1">
                <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
                <p className="text-[12.5px] text-text opacity-60">
                  {session.date.toLocaleDateString()} · {session.winners.length}{" "}
                  {session.winners.length === 1 ? "result" : "results"}
                </p>
              </div>
              <Tag variant="accent">Active</Tag>
              <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
            </Link>
          ))}
        </div>
      )}
      {previousSessions.length > 0 && (
        <Link
          href={`/clubs/${clubId}/sessions/previous`}
          className="flex items-center gap-3 px-5 py-3"
        >
          <History size={16} strokeWidth={2} className="text-text opacity-60" />
          <span className="flex-1 text-[14px] text-text">Previous sessions ({previousSessions.length})</span>
          <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
        </Link>
      )}

      <SectionHeader
        label={`Games (${games.length})`}
        action={
          <LinkButton href={`/clubs/${clubId}/games/new`} variant="secondary" compact>
            Add game
          </LinkButton>
        }
      />
      {games.length === 0 && (
        <p className="px-5 pb-4 text-[14px] text-text opacity-60">
          No games yet — add one before recording results.
        </p>
      )}

      <SectionHeader label="Members" />
      <div className="border-t border-divider">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <InitialSquare label={member.name} size={34} variant="accentTint" />
            <span className="flex-1 text-[14px] text-text">{member.name}</span>
            {member.id === club.owner && <Tag variant="neutral">Owner</Tag>}
          </div>
        ))}
      </div>

      <SectionHeader
        label="Join requests"
        action={requests.length > 0 ? <Tag variant="accent">{requests.length}</Tag> : undefined}
      />
      {requests.length === 0 ? (
        <p className="px-5 pb-6 text-[14px] text-text opacity-60">No pending requests.</p>
      ) : (
        <div className="border-t border-divider pb-2">
          {requests.map(({ player, requestedAt }) => (
            <JoinRequestRow key={player.id} player={player} clubId={clubId} requestedAt={requestedAt} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 6: Manual check**

From `/clubs`, click into a club. Confirm: header shows correct member/game/session counts; active sessions list correctly (empty state if none); "Previous sessions (N)" row only appears when N > 0 and links to a 404 until Task 11 lands (expected mid-phase); Games section shows the count and an "Add game" link (404 until Task 10 lands); Members lists everyone with the owner tagged; Join requests shows pending requests with working Approve/Decline (test with a second Clerk account if available, or at minimum confirm the buttons render without errors when there are zero requests).

- [ ] **Step 7: Commit**

```bash
git add src/app/lib/db/players.ts src/app/lib/db/players-actions.ts src/app/ui/clubs/JoinRequestRow.tsx src/app/clubs/\[clubId\]/page.tsx
git commit -m "feat: add Club detail screen with sessions, games, members, and join requests"
```

---

### Task 9: New session screen

**Files:**
- Modify: `src/app/lib/db/sessions-actions.ts`
- Create: `src/app/ui/clubs/NewSessionForm.tsx`
- Create: `src/app/clubs/[clubId]/sessions/new/page.tsx`

`addNewGameSession` currently redirects to `/sessions/?clubId=${clubId}` without capturing the inserted session's id. The design doc wants "Create session → session detail," and the only session-detail view available this phase is the `sessions/previousSession` bridge, which needs a `sessionId`. Update the action to capture and use it.

- [ ] **Step 1: Update `addNewGameSession`**

In `src/app/lib/db/sessions-actions.ts`, change:

```ts
export async function addNewGameSession(formData: FormData) {
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  if (!sessionName || !clubId) {
    throw new Error("Missing required fields");
  }
  await assertIsClubMember(clubId);

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
```

to:

```ts
export async function addNewGameSession(formData: FormData) {
  const sessionName = formData.get("sessionName")?.toString();
  const clubId = formData.get("clubId")?.toString();
  if (!sessionName || !clubId) {
    throw new Error("Missing required fields");
  }
  await assertIsClubMember(clubId);

  const [inserted] = await db
    .insert(sessions)
    .values({
      id: uuidv4(),
      clubId,
      name: sessionName,
      date: new Date(),
      active: true,
    })
    .returning();

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/sessions");
  redirect(`/sessions/previousSession?sessionId=${inserted.id}&clubId=${clubId}`);
}
```

- [ ] **Step 2: Create `src/app/ui/clubs/NewSessionForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { addNewGameSession } from "@/app/lib/db/sessions-actions";
import SubmitButton from "@/app/ui/ds/SubmitButton";
import LinkButton from "@/app/ui/ds/LinkButton";

const MAX_CHARS = 25;

function todayLabel() {
  return new Date()
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    .slice(0, MAX_CHARS);
}

export default function NewSessionForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState(todayLabel());

  return (
    <form action={addNewGameSession} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      <label className="text-[14px] font-medium text-text" htmlFor="sessionName">
        Session name
      </label>
      <input
        id="sessionName"
        name="sessionName"
        type="text"
        required
        maxLength={MAX_CHARS}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2 border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
      />
      <p className="mt-1 self-end text-[13px] text-accent-700">
        {name.length} / {MAX_CHARS}
      </p>
      <p className="mt-2 text-[13px] text-text opacity-65">
        Dated today — {todayLabel()}. The session stays active until you close it.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <SubmitButton block>Create session</SubmitButton>
        <LinkButton href={`/clubs/${clubId}`} variant="ghost" block>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/clubs/[clubId]/sessions/new/page.tsx`**

```tsx
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewSessionForm from "@/app/ui/clubs/NewSessionForm";

export default async function NewSessionPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="New session" />
      <NewSessionForm clubId={clubId} />
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 5: Manual check**

From a club detail page, click "New session," confirm the field defaults to today's date with a live character counter, submit, and confirm you land on the session-detail bridge page for the session you just created (not a 404 — this is the one place this phase's new UI hands off directly to a real, working page).

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/sessions-actions.ts src/app/ui/clubs/NewSessionForm.tsx src/app/clubs/\[clubId\]/sessions/new/page.tsx
git commit -m "feat: add New session screen"
```

---

### Task 10: Add game screen

**Files:**
- Modify: `src/app/lib/db/games-actions.ts`
- Create: `src/app/ui/clubs/AddGameForm.tsx`
- Create: `src/app/clubs/[clubId]/games/new/page.tsx`

- [ ] **Step 1: Update `addNewBoardGame`'s redirect target**

In `src/app/lib/db/games-actions.ts`, change the final line from:

```ts
  redirect(`/sessions?clubId=${clubId}`);
```

to:

```ts
  redirect(`/clubs/${clubId}`);
```

- [ ] **Step 2: Create `src/app/ui/clubs/AddGameForm.tsx`**

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
];

export default function AddGameForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState("");
  const [winCondition, setWinCondition] = useState("");
  const [direction, setDirection] = useState<"High" | "Low">("High");
  const isLeaderboard = winCondition === "0";
  const canSubmit = name.trim().length > 0 && winCondition !== "";

  return (
    <form action={addNewBoardGame} className="flex flex-1 flex-col px-5 pt-5">
      <input type="hidden" name="clubId" value={clubId} />
      {isLeaderboard && <input type="hidden" name="scoringDirection" value={direction} />}

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

`winCondition` values ("0" through "4") match `WIN_CONDITION_UI_TO_DB` in `src/app/lib/db/games.ts` exactly — `addNewBoardGame` reads `formData.get("winCondition")` and looks it up in that same map, so these string values are load-bearing, not arbitrary.

- [ ] **Step 3: Create `src/app/clubs/[clubId]/games/new/page.tsx`**

```tsx
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import AddGameForm from "@/app/ui/clubs/AddGameForm";

export default async function AddGamePage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Add game" />
      <AddGameForm clubId={clubId} />
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 5: Manual check**

From a club detail page, click "Add game." Confirm the submit button stays disabled until both a name and a win condition are chosen, the High/Low segmented control only appears for Leaderboard, and submitting returns you to the club detail page with the Games count incremented.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/db/games-actions.ts src/app/ui/clubs/AddGameForm.tsx src/app/clubs/\[clubId\]/games/new/page.tsx
git commit -m "feat: add Add game screen"
```

---

### Task 11: Previous sessions list screen

**Files:**
- Create: `src/app/clubs/[clubId]/sessions/previous/page.tsx`

- [ ] **Step 1: Create `src/app/clubs/[clubId]/sessions/previous/page.tsx`**

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getClubDetails } from "@/app/lib/db/clubs";
import { getAllInactiveSessions } from "@/app/lib/db/sessions";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";

export default async function PreviousSessionsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const [club, sessions] = await Promise.all([
    getClubDetails(clubId),
    getAllInactiveSessions(clubId),
  ]);
  const sorted = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Previous sessions" eyebrow={club.name} />
      <div className="border-t border-divider">
        {sorted.map((session) => (
          <Link
            key={session.id}
            href={`/sessions/previousSession?sessionId=${session.id}&clubId=${clubId}`}
            className="flex items-center gap-3 border-b border-divider px-5 py-[15px]"
          >
            <div className="flex-1">
              <p className="text-[15.5px] font-semibold text-text">{session.name}</p>
              <p className="text-[12.5px] text-text opacity-60">
                {session.date.toLocaleDateString()} · {session.winners.length}{" "}
                {session.winners.length === 1 ? "result" : "results"}
              </p>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="text-text opacity-45" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

From a club detail page with at least one finished session, click "Previous sessions (N)" and confirm the list shows every inactive session for that club, newest first, each linking to the session-detail bridge page.

- [ ] **Step 4: Commit**

```bash
git add src/app/clubs/\[clubId\]/sessions/previous/page.tsx
git commit -m "feat: add Previous sessions list screen"
```

---

### Task 12: Club stats placeholder screen

**Files:**
- Create: `src/app/clubs/[clubId]/stats/page.tsx`

This is deliberately **not** the real stats screen — it exists only so Club Detail's "Stats" button (built in Task 8) isn't a dead link. `getClubStats` (built in Phase 1) already computes everything a real stats screen would need; wiring it up to a full UI is the next phase's work.

- [ ] **Step 1: Create `src/app/clubs/[clubId]/stats/page.tsx`**

```tsx
import { getClubDetails } from "@/app/lib/db/clubs";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";

export default async function ClubStatsPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const club = await getClubDetails(clubId);

  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Club stats" eyebrow={club.name} />
      <div className="flex flex-1 items-center justify-center px-5 text-center">
        <p className="text-[14px] text-text opacity-60">
          Full stats are coming soon — session and results totals are already tracked behind the
          scenes, this screen just isn&apos;t built yet.
        </p>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: succeeds.

- [ ] **Step 3: Manual check**

From a club detail page, click "Stats" and confirm it opens this placeholder (styled consistently with the rest of the app, not a 404) rather than a broken link.

- [ ] **Step 4: Commit**

```bash
git add src/app/clubs/\[clubId\]/stats/page.tsx
git commit -m "feat: add Club stats placeholder screen"
```

---

### Task 13: Delete superseded old files

**Files:** deletions only, listed below.

Every file in this task is superseded by a screen built earlier in this phase and has no remaining caller once that screen replaced it. Do this task **last**, after Tasks 1-12 are all merged and manually verified working — deleting first and building replacements after would leave the app broken mid-phase.

- [ ] **Step 1: Grep-verify each deletion candidate has no remaining importer**

Before deleting anything, run this for every path in the list below and confirm the only hits are the file itself and (where noted) the one other file being deleted alongside it in this same task:

```bash
grep -rn "currentSession/currentSession\|ui/sessions/previousSessions\|ui/sessions/addNewSession\|Common/newSessionButton\|Common/sessionRedirectButton\|Common/pageRedirectButton\|ui/clubs/userClubs\|ui/clubs/club['\"]\|ui/add/addNewGame\|ui/add/addNewClub\|ui/requests/clubAccessRequests\|ui/players/playerPage\|Common/backButton\|sessions/Contexts\|sessions/sessionContextWrapper" src/app --include=*.tsx --include=*.ts
```

If this turns up an importer NOT already in the deletion list below (or not one of the explicitly-kept bridge files: `src/app/ui/requests/clubAccessRequests.tsx`'s own use of `BackButton`, or anything under `src/app/add/result/`, `src/app/add/player/`, `src/app/add/session/upload/`, `src/app/join/club/`), STOP and report it rather than deleting — that means something this plan didn't account for still depends on the file.

- [ ] **Step 2: Delete files superseded by Task 6 (Sessions tab rewrite)**

```bash
git rm src/app/sessions/Contexts.ts
git rm src/app/sessions/sessionContextWrapper.tsx
git rm src/app/ui/sessions/currentSession/currentSession.tsx
git rm src/app/ui/sessions/currentSession/currentSessionHeader.tsx
git rm src/app/ui/sessions/currentSession/currentSessionGames.tsx
git rm src/app/ui/sessions/currentSession/currentSessionImages.tsx
git rm src/app/ui/sessions/currentSession/currentSessionButton.tsx
git rm src/app/ui/sessions/previousSessions.tsx
git rm src/app/ui/Common/newSessionButton.tsx
```

- [ ] **Step 3: Delete files superseded by Task 4 (Clubs tab)**

```bash
git rm src/app/ui/clubs/userClubs.tsx
git rm src/app/ui/clubs/club.tsx
git rm src/app/ui/Common/sessionRedirectButton.tsx
git rm src/app/ui/Common/pageRedirectButton.tsx
```

- [ ] **Step 4: Delete files superseded by Task 5 (New club) and Task 9 (New session) old routes**

```bash
git rm -r src/app/add/club/
git rm src/app/ui/add/addNewClub.tsx
git rm -r src/app/sessions/newSession/
git rm src/app/ui/sessions/addNewSession.tsx
```

- [ ] **Step 5: Delete files superseded by Task 10 (Add game)**

```bash
git rm -r src/app/add/game/
git rm src/app/ui/add/addNewGame.tsx
```

- [ ] **Step 6: Delete files superseded by Task 8's inline join-requests section**

```bash
git rm -r src/app/requests/
git rm src/app/ui/requests/clubAccessRequests.tsx
```

- [ ] **Step 7: Delete the file superseded by Task 7 (Players tab)**

```bash
git rm src/app/ui/players/playerPage.tsx
```

- [ ] **Step 8: `backButton.tsx` — delete only if Step 1's grep confirms no remaining importer**

If the grep in Step 1 showed `src/app/ui/Common/backButton.tsx` is not imported by anything outside the files already deleted above, delete it:

```bash
git rm src/app/ui/Common/backButton.tsx
```

If it IS still imported by a kept file (e.g. something under `/add/player`, `/add/result`, or `/add/session/upload` you haven't read yet), leave it in place and note which file uses it in your task report instead of deleting.

- [ ] **Step 9: Verify the build**

Run: `npm run build`

Expected: succeeds — this is the real proof nothing still-needed was deleted. If it fails on a missing-module error, that means Step 1's grep missed an importer; restore the specific file with `git checkout -- <path>` and investigate before re-attempting.

- [ ] **Step 10: Manual check**

Click through every screen built in Tasks 3-12 one more time end to end (login → clubs → new club → club detail → new session → add game → previous sessions → stats placeholder → sessions tab → players tab), plus the three explicitly-kept bridge routes (`/join/club`, `/add/result`, `/add/session/upload` — these should look old-styled with the old TopNav, which is expected) to confirm nothing broke.

- [ ] **Step 11: Commit**

```bash
git commit -m "chore: delete old components and routes superseded by the Phase 2 redesign"
```

(The `git rm` commands above already stage the deletions — this commit just finalizes them; there's nothing else to `git add`.)

---

### Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run every check this repo has**

```bash
npm run lint
npm run build
npm run db:verify
npm run db:verify-layer
```

Expected: all four succeed. The last two aren't expected to change behavior this phase (no schema or data-layer logic changed, only redirect targets and one query's return shape) but should still be run to catch any regression.

- [ ] **Step 2: Full manual click-through**

Starting from a signed-out session: sign in → land on `/clubs` → create a club → see it appear → open it → add a game → create a session → land on the session-detail bridge → go back to the club → check "Previous sessions" once you have a finished one → check "Stats" (placeholder) → check the Sessions tab and Players tab both show the right cross-club data → toggle dark mode from the Clubs tab header and confirm every screen built this phase re-themes correctly (not just the ones with hardcoded light-mode assumptions) → sign out and confirm you land back on `/`.

- [ ] **Step 3: Final review**

Confirm via `git log --oneline` that all of Task 1 through Task 13's commits are present, and via `git status` that the working tree is clean (aside from the pre-existing unrelated `yarn.lock`/`design_handoff_mobile_redesign/` state noted in Phase 1).

---

## What the next phase picks up from here

This phase deliberately left two things unbuilt, both bridged to old-style pages in the meantime:
- **Session Detail** (notes/photos/finish-reopen/results list/edit-result entry point) — currently bridged to `src/app/sessions/previousSession/page.tsx`, unchanged since before this phase.
- **Add/Edit Result** and the **real Club Stats** screen (using `getClubStats` from Phase 1, already built and tested, just not wired to a UI yet) — Add/Edit Result isn't linked from anywhere new this phase built at all (the old `/add/result` bridge page has no inbound link from any new screen), so it's not urgent; Club Stats has a placeholder button ready to be swapped for the real thing.

Once those land, `src/app/sessions/previousSession/page.tsx` and its bridge links throughout this phase's screens should be replaced with real `/clubs/[clubId]/sessions/[sessionId]` routes, and the `/add/result` bridge can be retired the same way this phase retired `/add/club`, `/add/game`, and `/sessions/newSession`.

Also flagged for a product decision (not a code gap): `/join/club` (browse-and-request-to-join) has no designed replacement anywhere in the 12-screen handoff, and was left untouched rather than silently dropped.
