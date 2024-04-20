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
    <div className="w-full flex flex-col space-items items-center py-5">
      <div className="w-[95%] md:w-[35%] lg:w-[35%] xl:w-[25%] sm:w-[95%] flex-col border p-4 rounded-sm bg-black">
    <form action={addNewGameResult}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="clubId" value={clubId} />

        <div
          className="p-4 text-3xl md:text-3xl lg:text-4xl xl:text-4xl 
                    text-center font-['Montserrat'] font-semibold flex items-center text-tunnel-snake-white"
        >
          Add Result
        </div>

        <Results games={boardGames} players={players}></Results>

        <div className="flex flex-row gap-4 items-center ">
          {boardGames.length > 0 && (<SubmitButton label="Submit" />)}
          <CancelButton />
        </div>
    </form>
      </div>
    </div>
  );
}
