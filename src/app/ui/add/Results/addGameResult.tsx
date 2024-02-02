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
  const boardGames = await getAllBoardgames();

  return (
    <form action={addNewGameResult}>
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="bg-tunnel-snake-black flex-col items-center flex">
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
