import { Player } from "@/app/lib/definitions";
import { addNewGameSession } from "@/app/lib/actions";
import CancelButton from "../Common/cancelButton";

export interface AddNewSessionProps {
  players: Player[];
}

export default function AddNewSession(props: AddNewSessionProps) {
  const { players } = props;

  return (
    <form action={addNewGameSession}>
      <div className="w-[496px] h-[749px] p-12 bg-tunnel-snake-black border border-white flex-col justify-start items-start gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Add New Session
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Session name
          </div>
          <input
          id="sessionName"
          name="sessionName"
          type="text"

            className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex"
          />
        </div>
        <div className="flex-col justify-start items-start gap-4 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Players
          </div>
          <div className="flex-col justify-start items-start gap-5 flex">
            {players.map((player) => (
              <div
                className="justify-start items-center gap-3 inline-flex text-white"
                key={player.name}
              >
                <input
                  type="checkbox"
                  name="player"
                  id={player.id}
                  value={player.id}
                  className="w-6 h-6 relative text-white rounded-sm"
                />
                <div className="text-white text-base font-normal font-['Montserrat']">
                  {player.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <button type="submit" className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex">
          <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
            Create session
          </div>
        </button>
        <CancelButton />

      </div>
    </div>
    </form>
  );
}
