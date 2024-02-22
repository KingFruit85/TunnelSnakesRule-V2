import { getAllClubs } from "@/app/lib/actions";
import SessionRedirectButton from "../Common/sessionRedirectButton";
import { Destination } from "@/app/lib/definitions";
import JoinClubButton from "./joinClubButton";

export default async function AvailableClubs() {

  const clubs = await getAllClubs();

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
