import JoinClubButton from "./joinClubButton";
import { getPendingJoinRequestClubIds } from "@/app/lib/db/players";
import { getClubsPlayerIsNotAMemberOf } from "@/app/lib/db/clubs";
import EmptyState from "@/app/ui/ds/EmptyState";
import InitialSquare from "@/app/ui/ds/InitialSquare";

export interface AvailableClubsProps {
  userId: string;
}

export default async function AvailableClubs({ userId }: AvailableClubsProps) {
  const [clubs, pendingClubIds] = await Promise.all([
    getClubsPlayerIsNotAMemberOf(userId),
    getPendingJoinRequestClubIds(userId),
  ]);

  if (clubs.length === 0) {
    return <EmptyState title="No clubs to join" helper="You're already a member of every club." />;
  }

  return (
    <div className="border-t border-divider">
      {clubs.map((club) => (
        <div key={club.id} className="flex items-center gap-3 border-b border-divider px-5 py-3">
          <InitialSquare label={club.name} size={44} />
          <span className="flex-1 text-[15.5px] font-semibold text-text">{club.name}</span>
          <JoinClubButton clubId={club.id} requestPending={pendingClubIds.has(club.id)} />
        </div>
      ))}
    </div>
  );
}
