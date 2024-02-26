export default function CooperativeRadio() {
  return (
    <fieldset>
      <div className="flex flex-col text-center font-['Montserrat'] gap-2">
        <legend>Winner</legend>

        <div className="flex gap-4">
          <div>
            <input
              type="radio"
              id="contactChoice1"
              name="winner"
              value="Game"
              required
              className=""
              onChange={() => console.log("Game")}
            />
            <label className="pl-2" htmlFor="contactChoice1">Game</label>
          </div>

          <div>
            <input
              type="radio"
              id="contactChoice2"
              name="winner"
              value="Players"
              className=""
            />
            <label className="pl-2" htmlFor="contactChoice2">Players</label>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
