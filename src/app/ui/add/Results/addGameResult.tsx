import { getAllBoardgames, getAllPlayersBySessionId } from "@/app/lib/data";
import { addNewGameResult } from "@/app/lib/actions";
import Results from "../../winConditions/results";
import CancelButton from "../../Common/cancelButton";
import SubmitButton from "../../Common/submitButton";
import BackButton from "../../Common/backButton";

export interface AddGameResultProps {
  sessionId: string;
  clubId: string;
}

export default async function AddGameResult({
  sessionId,
  clubId,
}: AddGameResultProps) {
  const players = await getAllPlayersBySessionId(sessionId);
  const boardGames = await getAllBoardgames(clubId);

  return (
    <form action={addNewGameResult}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="clubId" value={clubId} />

      <div className="p-2 bg-black flex flex-col items-center w-[100%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%]">
        <div
          className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl 
                    text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
        >
          Add Result
        </div>

        <Results games={boardGames} players={players}></Results>

        <div className="flex flex-row gap-4 items-center ">
          <SubmitButton label="Submit" />
          <CancelButton />
        </div>
      </div>
    </form>
  );
}
