import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function PlayersLoading() {
  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Players</h1>
      </div>

      <div className="mt-4 flex-1 border-t-2 border-divider">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-3">
            <Skeleton className="h-[38px] w-[38px] shrink-0" />
            <Skeleton className="h-[15px] w-1/3" />
          </div>
        ))}
      </div>

      <BottomNav />
    </AppShell>
  );
}
