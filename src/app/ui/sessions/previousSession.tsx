import { getBoardgameById, getEventNotes, getEventWinner, getPlayerById } from "@/app/lib/data";
import {
  GameSession,
  PlayerResult,
} from "@/app/lib/definitions";
import { UUID } from "crypto";

export interface PreviousSessionGameResultProps {
  session: GameSession;
}

export default function PreviousSessionGameResult({
  session,
}: PreviousSessionGameResultProps) {
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

  return (
    <div className="p-4 flex flex-col gap-2">
      {Object.entries(groupedResults).map(([eventId, results]) => (
        <div
          className="w-[100%] border border-tunnel-snake-green rounded-sm flex flex-col items-center p-4"
          key={eventId}
        >
              <h2 className="text-tunnel-snake-green p-2 text-2xl">
                <u>{getBoardgameById(results[0].gameId).then((game) => game.name)}</u>
              </h2>
              <h2 className="text-tunnel-snake-orange p-2">
                <i>{getEventNotes(results[0].eventId).then((note) => note)}</i>
              </h2>
          {results.map((result) => (
            <div key={result.id}>

              <p>{getPlayerById(result.playerId).then((player) => player.name)} : {result.result}</p>
            </div>
          ))}
            <div className="p-2">
              Winner: {getEventWinner(results[0].eventId).then((winner) => winner.winner)}!
            </div>
        </div>
      ))}
    </div>
  );
}
