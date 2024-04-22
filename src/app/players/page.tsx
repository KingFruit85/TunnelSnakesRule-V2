/* eslint-disable @next/next/no-img-element */
import BackButton from "@/app/ui/Common/backButton";
import PlayerPage from "../ui/players/playerPage";
import { getPlayerById, getPlayerEvents } from "../lib/data";
import { UUID } from "crypto";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const playerId = searchParams.userid;
  console.log(playerId);

  const player = await getPlayerById(playerId);

  const playerEvents = await getPlayerEvents(player?.id as UUID);

  // get all the player's results

  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black ">
        <BackButton>Go Back</BackButton>
        <PlayerPage player={player} playerEvents={playerEvents} />
      </div>
    </div>
  );
}
