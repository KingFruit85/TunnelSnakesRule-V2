import { currentUser } from "@clerk/nextjs";
import SessionRedirectButton from "../Common/sessionRedirectButton";
import { Destination } from "@/app/lib/definitions";
import PageRedirectButton from "../Common/pageRedirectButton";
import { getUsersClubs } from "@/app/lib/data";
import Image from "next/image";

export interface UserClubsProps {}

export default async function UserClubs() {
  const user = await currentUser();

  const clubs = user ? await getUsersClubs(user?.id as string) : null;

  const pfp = user?.imageUrl;

  return (
    <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black">
      <Image
        src={pfp!}
        alt="profile picture"
        className="rounded-full w-20 h-20 m-auto mb-4"
        width={100}
        height={100}
      />

      {user?.firstName ? (
        <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mb-2 mt-2 mb-4">
          {user?.firstName}&apos;s clubs
        </div>
      ) : (
        <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat mb-2 mt-2 mb-4">
          Your clubs
        </div>
      )}

      {clubs && clubs.length > 0 ? (
        clubs.map((club) => (
          <div
            key={club.id}
            className="mb-4 flex-col flex items-center rounded-sm"
          >
            <SessionRedirectButton
              label={club.name}
              destination={Destination.ClubSessions}
              club={club}
            />
          </div>
        ))
      ) : (
        <p className="text-center">You are not in any clubs yet!</p>
      )}

      <div className="flex flex-row items-center place-content-center py-5">
        <div className="items-center m-4">
          <PageRedirectButton destination={Destination.AddNewClub} />
        </div>
        <div className="items-center m-4">
          <PageRedirectButton
            destination={Destination.JoinExistingClub}
            userId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}
