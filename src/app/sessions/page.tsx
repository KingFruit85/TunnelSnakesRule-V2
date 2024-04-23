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
import RedirectButton from "../ui/Common/sessionRedirectButton";
import { Destination } from "../lib/definitions";

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
    <div className="flex flex-col gap-2 items-center h-screen bg-black dark:bg-black text-white">
      <div className="text-3xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat pt-4 pb-4 bg-stone-500 flex w-[100%] justify-center text-tunnel-snake-white">
        {clubDetails.name}
      </div>
      <div className="flex hover:bg-tunnel-snake-orange">
        <RedirectButton
          destination={Destination.AddNewBoardGame}
          club={clubDetails}
        />
        <RedirectButton destination={Destination.Groups} club={clubDetails} />
      </div>
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mt-4 mb-2">
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
  );
}
