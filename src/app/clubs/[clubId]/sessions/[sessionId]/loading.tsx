import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/app/ui/ds/AppShell";
import SectionHeader from "@/app/ui/ds/SectionHeader";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function SessionDetailLoading() {
  return (
    <AppShell>
      <div className="flex items-center gap-3 border-b-2 border-divider px-5 py-4">
        <Link
          href="/sessions"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <ChevronLeft size={20} strokeWidth={2} className="text-accent" />
        </Link>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-[12.5px] w-20" />
          <Skeleton className="h-[19px] w-36" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <Skeleton className="h-[12.5px] w-24" />
        <Skeleton className="h-5 w-16" />
      </div>

      <SectionHeader label="Results" />
      <div className="border-t border-divider pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-divider px-5 py-3">
            <div className="flex-1">
              <Skeleton className="h-[15.5px] w-1/2" />
              <Skeleton className="mt-2 h-[13px] w-2/3" />
              <Skeleton className="mt-2 h-[12px] w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
