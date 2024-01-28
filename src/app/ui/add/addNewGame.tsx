import { addNewBoardGame } from "@/app/lib/actions";

export default function AddNewGame() {


  return (
    <form action={addNewBoardGame}>
      <div className=" p-12 bg-tunnel-snake-black border border-white flex-col justify-start items-start gap-8 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Add New Game
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Name
          </div>
          <input id="gameName" name="gameName" type="text"  className=" self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex" />
        </div>
        <div className="h-[65px] flex-col justify-start items-start gap-2 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Cover art URL
          </div>
          <input id="gameArt" name="gameArt" type="text"  className="self-stretch px-3 py-2.5 bg-tunnel-snake-grey rounded-sm border border-white justify-start items-start gap-2.5 inline-flex" />
        </div>
        <div className="flex-col justify-start items-start gap-4 flex">
          <div className="text-white text-sm font-medium font-['Montserrat']">
            Win conditions
          </div>
          <div className="flex-col justify-start items-start gap-5 flex">
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="teamBased"
                value="teamBased"
                className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Team based
              </div>
            </div>
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="cooperative"
                value="cooperative"
                className="w-6 h-6 relative bg-tunnel-snake-grey rounded-sm border border-white"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Co-operative
              </div>
            </div>
            <div className="justify-start items-center gap-3 inline-flex">
              <input
                type="radio"
                name="winCondition"
                id="leaderBoard"
                value="leaderBoard"
                className="w-6 h-6 relative bg-tunnel-snake-green rounded-sm"
              />
              <div className="text-white text-base font-normal font-['Montserrat']">
                Leader board
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-col justify-start items-start gap-5 flex">
        <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-center items-center gap-3 inline-flex">
          <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
            Add game
          </div>
        </button>
        <button className="w-[400px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
          <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">
            Cancel
          </div>
        </button>
      </div>
    </div>
    </form>
  );
}
