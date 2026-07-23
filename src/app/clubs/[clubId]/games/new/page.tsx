import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import AddGameForm from "@/app/ui/clubs/AddGameForm";

export default async function AddGamePage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="Add game" />
      <AddGameForm clubId={clubId} />
    </AppShell>
  );
}
