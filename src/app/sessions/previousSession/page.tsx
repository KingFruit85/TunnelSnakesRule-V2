"use server";

import {
  getAllPlayersBySessionId,
  getBoardgameById,
  getEventNotes,
  getEventWinner,
  getSessionDetails,
} from "@/app/lib/data";
import { Player, PlayerResult } from "@/app/lib/definitions";
import BackButton from "@/app/ui/Common/backButton";
import { UUID } from "crypto";
import Image from "next/image";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const sessionDetails = await getSessionDetails(searchParams.sessionId);
  const session = sessionDetails[0];
  const players = await getAllPlayersBySessionId(searchParams.sessionId);
  const sessionDate = session.date.toLocaleDateString();

  const images = session.imageurl
    ? (JSON.parse(session.imageurl) as string[])
    : ([] as string[]);

  type GroupedResults = {
    [eventId: UUID]: PlayerResult[];
  };

  const groupedResults: GroupedResults = {};

  session.playerResults.forEach((result) => {
    if (groupedResults[result.eventId]) {
      groupedResults[result.eventId].push(result);
    } else {
      groupedResults[result.eventId] = [result];
    }
  });

  const promises = Object.entries(groupedResults).map(
    async ([eventId, results]) => {
      const game = await getBoardgameById(results[0].gameId);
      const gameName = game.name;
      const note = await getEventNotes(results[0].eventId);
      const winner = await getEventWinner(results[0].eventId);
      const sessionPlayers = await getAllPlayersBySessionId(session.id);
      return { eventId, gameName, note, winner, results, sessionPlayers };
    }
  );

  const groupedResultsData = await Promise.all(promises);

  return (
    <div className="w-full flex flex-col space-items items-center py-5">
      <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black ">
        <BackButton>Go Back</BackButton>

        <div className="flex flex-col mt-1 mb-1 text-lg items-center text-4xl">
          <p>~{sessionDate}~</p>
          <p>{session.name}</p>
        </div>

        <div className="flex flex-row justify-between p-4">
          {players.map((player) => (
            <Link key={player.id} href={`/players?userid=${player.id}`}>
              <Image
                className="border border-black rounded-full ring-4"
                key={player.id}
                src={player.avatar}
                alt={player.name}
                width={50}
                height={50}
              />
            </Link>
          ))}
        </div>

        {session.notes && (
          <i className="w-[100%] text-tunnel-snake-orange flex flex-col items-center p-4">
            &quot;{session.notes}&quot;
          </i>
        )}

        <div className="grid grid-cols-3 p-4 content-center gap-2">
          {images.map((image: string, index: number) => (
            <Image
              key={index}
              src={image}
              alt="image"
              width={200}
              height={200}
              className="border border-black rounded-sm"
            />
          ))}
        </div>

        {groupedResultsData.map(
          ({ eventId, gameName, note, winner, results }) => (
            <div
              className="w-[100%] border border-tunnel-snake-green rounded-sm flex flex-col items-center p-4"
              key={eventId}
            >
              <h2 className="text-tunnel-snake-green p-2">
                <u>{gameName}</u>
              </h2>
              <h2 className="text-tunnel-snake-orange p-2">
                <i>{note}</i>
              </h2>
              {results.map((result) => {
                const player = players.find(
                  (player) => player.id === result.playerId
                );
                const playerName = player ? player.name : "Unknown Player";

                return (
                  <div key={result.id}>
                    <p>
                      {playerName} : {result.result}
                    </p>
                  </div>
                );
              })}
              <div className="p-2">Winner: {winner.winner}!</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
