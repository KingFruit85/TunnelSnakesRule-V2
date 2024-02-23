import JoinClubButton from "./joinClubButton";
import { getClubsPlayerIsNotAMemberOf } from "@/app/lib/data";

export interface AvailableClubsProps {
  userId: string;
}


export default async function AvailableClubs({userId}: AvailableClubsProps) {

  const clubs = await getClubsPlayerIsNotAMemberOf(userId);

  return (
    <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[35%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black">
      <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mb-2 mt-2">
        Avalible clubs
      </div>

      {clubs && clubs.length > 0 ? (
        clubs.map((club) => (
          <div
            key={club.id}
            className="mb-4 flex-col flex items-center rounded-sm"
          >
            <JoinClubButton club={club} />
          </div>
        ))
      ) : (
        <p className="text-center">You are not in any clubs yet!</p>
      )}
    </div>
  );
}
