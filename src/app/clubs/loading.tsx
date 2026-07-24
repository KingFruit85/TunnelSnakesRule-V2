import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function ClubsLoading() {
  return (
    <AppShell>
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">
            Board game clubs
          </p>
          <h1 className="text-[30px] font-bold text-text">Clubs</h1>
        </div>
      </div>

      <div className="px-5 pt-4">
        <Skeleton className="h-11 w-full" />
      </div>

      <div className="mt-4 flex-1 border-t-2 border-divider">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-[18px]">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-[17px] w-2/3" />
              <Skeleton className="mt-2 h-[12.5px] w-1/3" />
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </AppShell>
  );
}
