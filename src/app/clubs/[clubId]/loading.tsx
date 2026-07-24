import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/app/ui/ds/AppShell";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function ClubDetailLoading() {
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
        <Skeleton className="h-[19px] w-32" />
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        <Skeleton className="h-14 w-14 shrink-0" />
        <div>
          <Skeleton className="h-[26px] w-40" />
          <Skeleton className="mt-2 h-[12.5px] w-28" />
        </div>
      </div>

      <SectionHeader label="Sessions" />
      <div className="border-t border-divider">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <div className="flex-1">
              <Skeleton className="h-[15.5px] w-1/2" />
              <Skeleton className="mt-2 h-[12.5px] w-1/3" />
            </div>
          </div>
        ))}
      </div>

      <SectionHeader label="Games" />
      <div className="px-5 pb-2">
        <Skeleton className="h-[14px] w-2/3" />
      </div>

      <SectionHeader label="Members" />
      <div className="border-t border-divider">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <Skeleton className="h-[34px] w-[34px] shrink-0" />
            <Skeleton className="h-[14px] w-1/3" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
