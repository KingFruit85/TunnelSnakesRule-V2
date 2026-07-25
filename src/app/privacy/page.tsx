// src/app/privacy/page.tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/app/ui/ds/AppShell";
import { PRESS_SCALE_CLASS } from "@/app/ui/ds/tint";

export const metadata = {
  title: "Privacy Policy | Tunnel Snakes Rule",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="flex items-center gap-3 border-b-2 border-divider px-5 py-4">
        <Link
          href="/"
          aria-label="Back"
          className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${PRESS_SCALE_CLASS}`}
        >
          <ChevronLeft size={20} strokeWidth={2} className="text-accent" />
        </Link>
        <h1 className="text-[19px] font-bold text-text">Privacy Policy</h1>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5 text-[15px] leading-relaxed text-text">
        <p className="opacity-65">Last updated July 25, 2026</p>

        <p>
          Tunnel Snakes Rule is a game-night tracker for a private group of clubs, players, and
          sessions. This page explains what information the app collects and how it&apos;s used.
        </p>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-semibold">Information we collect</h2>
          <p>
            When you sign in, our authentication provider (Clerk) collects your name, email
            address, and profile photo from whichever sign-in method you use, including Facebook
            or Google. We don&apos;t receive your password.
          </p>
          <p>
            When you use the app, we store the club, session, game, and result data you enter
            (such as scores, players, and roles), along with any avatar or session photos you
            upload.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-semibold">How we use it</h2>
          <p>
            Your information is used only to run the app: signing you in, showing your clubs and
            game history, and displaying player profiles to other members of your clubs. We do
            not sell your data or share it with advertisers.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-semibold">Where it&apos;s stored</h2>
          <p>
            Account and sign-in data is managed by Clerk. App data (clubs, sessions, players,
            results) is stored in a Postgres database, and uploaded images are stored via Vercel
            Blob. Both are hosted on Vercel&apos;s infrastructure.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-semibold">Deleting your data</h2>
          <p>
            To delete your account and associated data, contact us using the email below.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a
              href="mailto:christopher.aaron.long@gmail.com"
              className="text-accent underline underline-offset-2"
            >
              christopher.aaron.long@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </AppShell>
  );
}
