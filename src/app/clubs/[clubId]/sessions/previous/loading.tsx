import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/app/ui/ds/AppShell";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function PreviousSessionsLoading() {
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
          <h1 className="text-[19px] font-bold text-text">Previous sessions</h1>
        </div>
      </div>
      <div className="border-t border-divider">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-[15px]">
            <div className="flex-1">
              <Skeleton className="h-[15.5px] w-1/2" />
              <Skeleton className="mt-2 h-[12.5px] w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
