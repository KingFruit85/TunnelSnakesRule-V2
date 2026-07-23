import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewSessionForm from "@/app/ui/clubs/NewSessionForm";

export default async function NewSessionPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return (
    <AppShell>
      <BackHeader href={`/clubs/${clubId}`} title="New session" />
      <NewSessionForm clubId={clubId} />
    </AppShell>
  );
}
