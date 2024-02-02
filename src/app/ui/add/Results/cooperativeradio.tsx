export default function CooperativeRadio() {
  return (
    <fieldset>
      <div className="flex gap-2">
        <legend>Winner</legend>

        <input
          type="radio"
          id="contactChoice1"
          name="winner"
          value="Game"
          required
          className=""
          onChange={() => console.log("Game")}
        />
        <label htmlFor="contactChoice1">Game</label>

        <input
          type="radio"
          id="contactChoice2"
          name="winner"
          value="Players"
          className=""
        />
        <label htmlFor="contactChoice2">Players</label>

      </div>
    </fieldset>
  );
}
