/* eslint-disable @next/next/no-img-element */
import {
  getAllPlayersBySessionId,
  getPlayerById,
  getSessionDetails,
} from "@/app/lib/data";
import BackButton from "@/app/ui/Common/backButton";
import PreviousSessionGameResult from "@/app/ui/sessions/previousSession";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const sessionId = searchParams.sessionId;

  // get the resulkts for the session
  const sessionDetails = await getSessionDetails(sessionId);
  const session = sessionDetails[0];
  const players = await getAllPlayersBySessionId(sessionId);
  const playerNamesString = players.map((player) => player.name).join(", ");

  const images = session.imageurl
    ? (JSON.parse(session.imageurl) as string[])
    : ([] as string[]);

  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black">
        <BackButton>Go Back</BackButton>

        <div className="mt-4  text-base">
          <div className="mt-1 mb-1 text-lg">
            {session.date.toLocaleDateString()} - {session.name}
          </div>
        </div>

        <i className="text-lg text-tunnel-snake-green text-xs">
          {playerNamesString}
        </i>

        <div className="text-xs pb-2 text-tunnel-snake-orange">
          {session.notes && (
            <div className="text-xs text-tunnel-snake-orange">
              &quot;{session.notes}&quot;
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 ">
          {images.map((image: string, index: number) => (
            <div key={index}>
              <img
                src={image}
                alt="image"
                width={100}
                height={100}
                className="rounded-md pb-2 "
              />
            </div>
          ))}
        </div>

        {session.playerResults && (
          <PreviousSessionGameResult session={session} players={players} />
        )}
      </div>
    </div>
  );
}
