import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/app/ui/ds/AppShell";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function ClubStatsLoading() {
  return (
    <AppShell>
      <div className="flex items-center gap-3 border-b-2 border-divider px-5 py-4">
        <Link
          href="/clubs"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <ChevronLeft size={20} strokeWidth={2} className="text-accent" />
        </Link>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-[12.5px] w-20" />
          <h1 className="text-[19px] font-bold text-text">Club stats</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b-2 border-divider">
        <div className="border-r border-divider px-5 py-4">
          <Skeleton className="h-[28px] w-10" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">Sessions</p>
        </div>
        <div className="px-5 py-4">
          <Skeleton className="h-[28px] w-10" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">
            Results logged
          </p>
        </div>
      </div>

      <div className="flex-1">
        <p className="px-5 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
          Most wins
        </p>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <span className="w-4 text-[13px] text-text opacity-45">{i + 1}</span>
            <Skeleton className="h-[38px] w-[38px] shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-[15px] w-1/3" />
              <Skeleton className="mt-2 h-[12px] w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
