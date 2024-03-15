import { getPlayerById } from "@/app/lib/data";
import {
  Destination,
  GameResults,
  GameSession,
  PlayerScore,
  ScoringDirection,
  WinCondition,
} from "@/app/lib/definitions";
import PageRedirectButton from "../Common/pageRedirectButton";
import router from "next/navigation";
import BackButton from "../Common/backButton";

export interface PreviousSessionGameResultProps {
  result: GameResults;
}

export default function PreviousSessionGameResult({
  result,
}: PreviousSessionGameResultProps) {
  // calculate winner

  let playerScores = result.playerScores;

  console.log(playerScores);

  const getWinner = async (playerScores: any[]) => {
    switch (parseInt(result.winCondition.toString())) {
      case WinCondition.LeaderBoard:
        const scores = playerScores.sort((a, b) => a.score - b.score);
        const highestScore = scores[scores.length - 1].score;
        const lowestScore = scores[0].score;

        // If tied winner
        const tiedHigh = scores.filter((score) => score.score === highestScore);

        if (tiedHigh.length > 1) {
          const tiedPlayerNamesPromises = tiedHigh.map(async (result) => {
            const player = await getPlayerById(result.playerId);
            return player.name;
          });

          const tiedPlayerNames = await Promise.all(tiedPlayerNamesPromises);
          return `Tie between ${tiedPlayerNames.join(
            " and "
          )} with ${highestScore} points`;
        }

        const tiedLow = scores.filter((score) => score.score === lowestScore);

        if (tiedLow.length > 1) {
          const tiedPlayerNamesPromises = tiedLow.map(async (result) => {
            const player = await getPlayerById(result.playerId);
            return player.name;
          });

          const tiedPlayerNames = await Promise.all(tiedPlayerNamesPromises);
          return `Tie between ${tiedPlayerNames.join(
            " and "
          )} with ${lowestScore} points`;
        }

        // If single winner
        if (result.scoringDirection === "High") {
          const highestScoringPlayer = scores[scores.length - 1];
          const player = await getPlayerById(highestScoringPlayer.playerId);
          return player.name;
        } else {
          const lowestScoringPlayer = scores[0];
          const player = await getPlayerById(lowestScoringPlayer.playerId);
          return player.name;
        }

      case WinCondition.TeamBased:
        console.log(result);
        return result.winner;

      case WinCondition.Coopratitive:
        return result.winner;
        // Handle other cases as necessary
        break;

      default:
        return "No winner";
    }
  };

  return (
    <div className="border border-tunnel-snake-green flex flex-col gap-2 items-center pb-4">
      <div className="text-lg"> {result.gameName}</div>
      <div className="text-xs flex gap-1 pb-2">
        {" "}
        Winner:{" "}
        <div className="text-tunnel-snake-orange">
          {getWinner(result.playerScores)}
        </div>{" "}
        !
      </div>

      <div className="flex justify-between gap-4">
        <div className="flex p-2 flex-col">
          <div className="text-base flex flex-col text-left"> Results </div>
          <div>
            {result.playerScores.map((playerScore: any) => {
              return (
                <div className="flex items-left pb-1">
                  <div key={playerScore.id} className="text-xs">
                    {playerScore.team ? `${playerScore.team}: ` : ""}
                    {getPlayerById(playerScore.playerId).then(
                      (player) => player.name
                    )}
                  </div>
                  <div key={playerScore.id} className="text-xs">
                    : {playerScore.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-[40%] p-2 text-base text-center">
          Notes
          <div className="text-xs">{result.gameResultNotes}</div>
        </div>
      </div>
    </div>
  );
}
