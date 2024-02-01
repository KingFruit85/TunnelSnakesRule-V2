import { getAllBoardgames, getAllPlayersBySessionId } from "@/app/lib/data";
import { addNewGameResult } from "@/app/lib/actions";
import Results from "../winConditions/results";
import CancelButton from "../Common/cancelButton";

export interface AddGameResultProps {
  sessionId: string;
}

export default async function AddGameResult(props: AddGameResultProps) {
  const { sessionId } = props;
  const players = await getAllPlayersBySessionId(sessionId);
  console.log('addGameResult players: ', players);
  const boardGames = await getAllBoardgames();

  return (
    <form action={addNewGameResult}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="p-12  bg-tunnel-snake-black border border-white flex-col items-center gap-8 inline-flex">
        <div className="flex-row items-center gap-5 flex">
          <div className="text-white text-[32px] font-semibold font-['Montserrat']">
            Add Result
          </div>
          <img src={"/Paper.svg"} alt={"Paper icon"} />
        </div>
        <div className="flex-col items-center">
          <Results games={boardGames} players={players}></Results>
        </div>
        <div className="flex-row justify-start items-start gap-5 flex">
          <button
            type="submit"
            className="self-stretch px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3"
          >
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add result
            </div>
          </button>
          <CancelButton width={0} />
        </div>
      </div>
    </form>
  );
}
