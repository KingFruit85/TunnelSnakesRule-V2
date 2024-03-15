import { UUID } from "crypto";
import JoinClubButton from "./joinClubButton";
import {
  checkAccessRequestStatus,
  getClubsPlayerIsNotAMemberOf,
} from "@/app/lib/data";
import { Club, ClubAndRequestStatus } from "@/app/lib/definitions";
import BackButton from "../Common/backButton";

export interface AvailableClubsProps {
  userId: string;
}

export default async function AvailableClubs({ userId }: AvailableClubsProps) {
  const clubs = await getClubsPlayerIsNotAMemberOf(userId);

  // for each club in the list, check if the player has already requested access

  const clubPromises = clubs.map(async (club) => {
    const accessRequestPending = await checkAccessRequestStatus(
      userId,
      club.id as UUID
    );

    return {
      club: club as Club,
      accessRequestPending: accessRequestPending,
    } as ClubAndRequestStatus;
  });

  const clubStatuses = await Promise.all(clubPromises);

  return (
    <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[35%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black">
      <BackButton>Go Back</BackButton>
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mb-6 mt-2">
        Avalible clubs
      </div>

      {clubStatuses && clubStatuses.length > 0 ? (
        clubStatuses.map((club) => (
          <div
            key={club.club.id}
            className="mb-4 flex-col flex items-center rounded-sm"
          >
            {<JoinClubButton club={club} />}
          </div>
        ))
      ) : (
        <p className="text-center">There are no new clubs to join …</p>
      )}
    </div>
  );
}
