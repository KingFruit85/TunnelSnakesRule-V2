import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import Skeleton from "@/app/ui/ds/Skeleton";

export default function NewResultLoading() {
  return (
    <AppShell>
      <BackHeader href="/clubs" title="Add result" />
      <div className="flex flex-col gap-4 px-5 py-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </AppShell>
  );
}
