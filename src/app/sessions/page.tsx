import { getAllActiveSessions, getAllInactiveSessions, getClubDetails } from "@/app/lib/data";
import SessionContextWrapper from "./sessionContextWrapper";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const clubId = searchParams.clubId;

  const activeSessions = await getAllActiveSessions(clubId);
  const previousSessions = await getAllInactiveSessions(clubId);

  return (
    <div className="flex flex-col gap-2 items-center  h-screen">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mt-4 mb-2">
        Active Sessions
      </div>
      <SessionContextWrapper
        clubId={clubId}
        activeSessions={activeSessions}
        previousSessions={previousSessions}
      />
    </div>
  );
}
