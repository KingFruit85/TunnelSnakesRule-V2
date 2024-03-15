import { getAllPlayersBySessionId, getSessionDetails } from "@/app/lib/data";
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
  const players = await getAllPlayersBySessionId(sessionId);
  const playerNamesString = players.map((player) => player.name).join(", ");

  const gameResults = sessionDetails.gameResults;
  const images = sessionDetails.imageurl
    ? (JSON.parse(sessionDetails.imageurl) as string[])
    : ([] as string[]);

  return (
    <div
      className="
                p-4 
                text-3xl 
                md:text-3xl 
                lg:text-4xl 
                xl:text-4xl
                text-center font-['Montserrat']
                font-semibold 
                flex 
                flex-col
                items-left 
                text-tunnel-snake-white
                border
                m-4
                bg-tunnel-snake-black"
    >
      <BackButton>Go Back</BackButton>

      <div className="mt-2  text-base">
        {sessionDetails.date.toLocaleDateString()}
        <div className="mt-1 mb-1 text-lg">{sessionDetails.name}</div>
      </div>

      <i className="text-lg text-tunnel-snake-green text-xs">
        {playerNamesString}
      </i>

      <div className="text-xs pb-2 text-tunnel-snake-orange">
        {sessionDetails.notes && (
          <div className="text-xs text-tunnel-snake-orange">
            &quot;{sessionDetails.notes}&quot;
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

      {gameResults &&
        gameResults.map((result) => (
          <div key={result.id} className="pb-2">
            <PreviousSessionGameResult result={result} />
          </div>
        ))}
    </div>
  );
}
