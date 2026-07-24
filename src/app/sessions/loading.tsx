import AppShell from "@/app/ui/ds/AppShell";
import BottomNav from "@/app/ui/ds/BottomNav";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function SessionsLoading() {
  return (
    <AppShell>
      <div className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text opacity-55">All clubs</p>
        <h1 className="text-[30px] font-bold text-text">Sessions</h1>
      </div>

      <div className="mt-4 flex-1 border-t-2 border-divider">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider px-5 py-[15px]">
            <div className="flex-1">
              <Skeleton className="h-[15.5px] w-1/2" />
              <Skeleton className="mt-2 h-[12.5px] w-2/3" />
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </AppShell>
  );
}
