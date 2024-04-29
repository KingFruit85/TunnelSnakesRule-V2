import {
  checkForOutstandingClubAccessRequests,
  checkIfPlayerIsClubOwner,
  getAllActiveSessionDetails,
  getAllBoardgames,
  getAllInactiveSessions,
  getClubDetails,
} from "@/app/lib/data";
import SessionContextWrapper from "./sessionContextWrapper";
import { currentUser } from "@clerk/nextjs";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const clubId = searchParams.clubId;
  const user = await currentUser();
  const clubDetails = await getClubDetails(clubId);

  const activeSessions = await getAllActiveSessionDetails(clubId);
  const previousSessions = await getAllInactiveSessions(clubId);
  const boardgames = await getAllBoardgames(clubId);

  const isClubOwner = user
    ? await checkIfPlayerIsClubOwner(clubId, user.id)
    : false;
  const accessRequestsPending = user
    ? await checkForOutstandingClubAccessRequests(clubId)
    : false;

  return (
    <div className="flex flex-col gap-2 h-screen bg-black dark:bg-black items-center">
      <div className="text-3xl md:text-3xl lg:text-3xl xl:text-3xl italic text-tunnel-snake-green pt-4 pb-4 flex justify-center flex">
        {clubDetails.name}
      </div>

      <div className="flex flex-col items-left">
        <div className="text-2xl text-left text-white flex pl-4">
          Active Sessions
        </div>

        <SessionContextWrapper
          clubId={clubId}
          userId={user!.id}
          activeSessions={activeSessions}
          previousSessions={previousSessions}
          isClubOwner={isClubOwner}
          accessRequestsPending={accessRequestsPending}
          boardgames={boardgames}
        />
      </div>
    </div>
  );
}
