import AppShell from "@/app/ui/ds/AppShell";
import BackHeader from "@/app/ui/ds/BackHeader";
import NewClubForm from "@/app/ui/clubs/NewClubForm";

export default function NewClubPage() {
  return (
    <AppShell>
      <BackHeader href="/clubs" title="New club" />
      <NewClubForm />
    </AppShell>
  );
}
