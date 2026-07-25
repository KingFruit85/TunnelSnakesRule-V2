import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import AvailableClubs from "@/app/ui/clubs/AvailableClubs";

export default async function JoinClubPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <AppShell>
      <BackHeader href="/clubs" title="Join a club" />
      <AvailableClubs userId={userId} />
    </AppShell>
  );
}
