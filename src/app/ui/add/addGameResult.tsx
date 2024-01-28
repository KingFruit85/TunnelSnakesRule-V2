import {
  getAllBoardgames,
  getAllPlayersBySessionId,
} from "@/app/lib/data";
import { addNewGameResult } from "@/app/lib/actions";
import { Button } from "@mui/material";
import Results from "../winConditions/results";

export interface AddGameResultProps {
  sessionId: string;
}

export default async function AddGameResult(props: AddGameResultProps) {
  const { sessionId } = props;
  const players = await getAllPlayersBySessionId(sessionId);
  const boardGames = await getAllBoardgames();

  return (
    <form action={addNewGameResult}>
      <input
        type="hidden"
        name="sessionId"
        value={sessionId}
      />
      <div className="p-12 bg-tunnel-snake-black border border-white flex-col justify-start items-start gap-8 inline-flex">
        <div className="flex-col justify-start items-start gap-5 flex">
          <div className="text-white text-[32px] font-semibold font-['Montserrat']">
            Add Result
          </div>
        </div>
        <Results games={boardGames} players={players} ></Results>
        <div className="flex-row justify-start items-start gap-5 flex">
          <Button
            type="submit"
            className="self-stretch px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3"
          >
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add result
            </div>
          </Button>
          <Button className="self-stretch px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">
              Cancel
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
}
