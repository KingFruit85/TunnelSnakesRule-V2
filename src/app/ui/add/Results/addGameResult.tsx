import { getAllBoardgames, getAllPlayersBySessionId } from "@/app/lib/data";
import { addNewGameResult } from "@/app/lib/actions";
import Results from "../../winConditions/results";
import CancelButton from "../../Common/cancelButton";
import SubmitButton from "../../Common/submitButton";

export interface AddGameResultProps {
  sessionId: string;
}

export default async function AddGameResult(props: AddGameResultProps) {
  const { sessionId } = props;
  const players = await getAllPlayersBySessionId(sessionId);
  console.log("Players in game results: ", players);
  const boardGames = await getAllBoardgames();

  return (
    <form action={addNewGameResult}>
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="p-4 bg-black flex flex-col items-center w-[95%] md:w-[40%] lg:w-[40%] xl:w-[40%] sm:w-[95%]">
        <div className=" text-center font-montserrat flex items-center text-tunnel-snake-green">
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
