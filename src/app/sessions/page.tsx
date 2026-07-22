import {
  checkForOutstandingClubAccessRequests,
  checkIfPlayerIsClubOwner,
  getAllActiveSessionDetails,
  getAllBoardgames,
  getAllInactiveSessions,
  getClubDetails,
} from "@/app/lib/data";
import SessionContextWrapper from "./sessionContextWrapper";
import { currentUser } from "@clerk/nextjs/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { clubId } = await searchParams;
  const user = await currentUser();

  const [
    clubDetails,
    activeSessions,
    previousSessions,
    boardgames,
    isClubOwner,
    accessRequestsPending,
  ] = await Promise.all([
    getClubDetails(clubId),
    getAllActiveSessionDetails(clubId),
    getAllInactiveSessions(clubId),
    getAllBoardgames(clubId),
    user ? checkIfPlayerIsClubOwner(clubId, user.id) : Promise.resolve(false),
    user
      ? checkForOutstandingClubAccessRequests(clubId)
      : Promise.resolve(false),
  ]);

  return (
    <div className="flex flex-col gap-2 h-screen bg-black dark:bg-black items-center">
      <div className="text-6xl italic text-tunnel-snake-green pl-4 pr-4 pt-4 pb-4 flex justify-center flex">
        <span className="bg-gradient-to-b from-[#96C431] to-[#FE8A1F] bg-clip-text text-transparent">
          {clubDetails.name}
        </span>
      </div>

      <div className="flex flex-col items-left">
        <div className="text-2xl text-left text-white flex pl-4">
          Active Sessions
        </div>

        <SessionContextWrapper
          clubId={clubId}
          userId={user?.id ?? ""}
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
