export default function LeaderboardRadio() {
  return (
    <fieldset>
      <div className="flex flex-col text-center gap-2 font-['Montserrat']">
        <legend>Scoring direction </legend>
        <div className="flex gap-4">
          <div>
            <input
              type="radio"
              id="contactChoice1"
              name="scoringDirection"
              value="High"
              required
              className=""
            />
            <label className="pl-2" htmlFor="contactChoice1">High</label>
          </div>

          <div>
            <input
              type="radio"
              id="contactChoice2"
              name="scoringDirection"
              value="Low"
              className=""
            />
            <label className="pl-2" htmlFor="contactChoice2">Low</label>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
