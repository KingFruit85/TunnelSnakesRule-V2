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

import {
  LinearTextGradient,
  RadialTextGradient,
  ConicTextGradient,
} from "react-text-gradients-and-animations";

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
      <div className="text-6xl italic text-tunnel-snake-green pl-4 pr-4 pt-4 pb-4 flex justify-center flex">
        <LinearTextGradient
          angle={0}
          colors={["#96C431", "#FE8A1F"]}
          animate={false}
          animateDirection={"vertical"}
          animateDuration={30}
        >
          {clubDetails.name}
        </LinearTextGradient>
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
