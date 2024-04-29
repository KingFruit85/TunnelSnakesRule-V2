import { BoardGame, GameSession } from "@/app/lib/definitions";
import Image from "next/image";

export interface CurrentSessionGamesProps {
  session: GameSession;
  boardgames: BoardGame[];
}

export default function CurrentSessionGames({
  session,
  boardgames,
}: CurrentSessionGamesProps) {
  interface EventSummary {
    eventId: string;
    numberOfPlayers: number;
    boardgameName: string;
    winner: string;
  }

  const summary: EventSummary[] = session.playerResults.reduce(
    (acc: EventSummary[], playerResult) => {
      const existingEventIndex = acc.findIndex(
        (event) => event.eventId === playerResult.eventId
      );

      if (existingEventIndex !== -1) {
        // If event already exists, update player count
        acc[existingEventIndex].numberOfPlayers++;
      } else {
        // If event doesn't exist, create a new object
        const newEvent: EventSummary = {
          eventId: playerResult.eventId,
          numberOfPlayers: 1,
          boardgameName:
            boardgames.find((g) => g.id === playerResult.gameId)?.name ||
            "Unknown",
          winner: "",
        };
        acc.push(newEvent);
      }

      return acc;
    },
    []
  );

  return (
    <div className="mt-3 mb-4 ml-4 mr-4">
      {summary.map(
        (event: EventSummary) =>
          event.eventId && (
            <div key={event.eventId} className="flex gap-2">
              <Image
                className=""
                src={"/Players.svg"}
                width={20}
                height={20}
                alt={"number of players in game icon"}
              />
              <div className="">{event.numberOfPlayers}</div>
              <div className="">-</div>
              <div className="text-tunnel-snake-orange">
                {event.boardgameName}
              </div>
              <div className="">
                {`winner ${
                  session.winners.find((w) => w.id === event.eventId)?.winner
                }!`}
              </div>
            </div>
          )
      )}
    </div>
  );
}
