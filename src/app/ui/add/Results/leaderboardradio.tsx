export default function LeaderboardRadio() {
  return (
    <fieldset>
      <div className="flex gap-2">
        <legend>Scoring direction </legend>
        <input
          type="radio"
          id="contactChoice1"
          name="scoringDirection"
          value="High"
          required
          className=""
        />
        <label htmlFor="contactChoice1">High</label>

        <input
          type="radio"
          id="contactChoice2"
          name="scoringDirection"
          value="Low"
          className=""
        />
        <label htmlFor="contactChoice2">Low</label>
      </div>
    </fieldset>
  );
}
