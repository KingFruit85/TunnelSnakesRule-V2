/* eslint-disable @next/next/no-img-element */
import {
  getAllPlayersBySessionId,
  getPlayerById,
  getSessionDetails,
} from "@/app/lib/data";
import BackButton from "@/app/ui/Common/backButton";
import PreviousSessionGameResult from "@/app/ui/sessions/previousSession";
import Image from "next/image";

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

  const images = session.imageurl
    ? (JSON.parse(session.imageurl) as string[])
    : ([] as string[]);

  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black ">
        <BackButton>Go Back</BackButton>

        <div className="flex flex-col mt-1 mb-1 text-lg items-center text-4xl">
          <div>~{session.date.toLocaleDateString()}~</div>
          <div>{session.name}</div>
        </div>

        <i className="flex flex-row justify-between p-4">
          {players.map((player) => (
            <Image
              className="border border-black rounded-full ring-4"
              key={player.id}
              src={player.avatar}
              alt={player.name}
              width={50}
              height={50}
            />
          ))}
        </i>

        {session.notes && (
          <i className="w-[100%] text-tunnel-snake-orange flex flex-col items-center p-4">
            &quot;{session.notes}&quot;
          </i>
        )}

        <div className="grid grid-cols-3 p-4 content-center gap-2">
          {images.map((image: string, index: number) => (
            <div key={index}>
              <Image
                src={image}
                alt="image"
                width={200}
                height={200}
                className="border border-black rounded-sm"
              />
            </div>
          ))}
        </div>

        {session.playerResults && (
          <PreviousSessionGameResult session={session} />
        )}
      </div>
    </div>
  );
}
