import { getAllClubSessionNames, getAllPlayersInClub } from "@/app/lib/data";
import AddNewSession from "@/app/ui/sessions/addNewSession";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { clubId } = await searchParams;
  const players = await getAllPlayersInClub(clubId);
  // const allPreviousSessionNames = await getAllClubSessionNames(clubId);

  // console.log(allPreviousSessionNames);

  return (
    <div className="w-full flex flex-col space-items items-center py-5 bg-black">
      <AddNewSession players={players} clubId={clubId} />
    </div>
  );
}
