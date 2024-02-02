export default function TeambasedRadio() {
  return (
    <fieldset>
      <div className="flex">
        <legend>Winner</legend>

        <div className="flex items-center gap-2 ">
          <input
            type="radio"
            id="contactChoice1"
            name="winner"
            value="Team 1"
            className=""
          />
          <label htmlFor="contactChoice1">Team 1</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="contactChoice2"
            name="winner"
            value="Team 2"
            className=""
          />
          <label htmlFor="contactChoice2">Team 2</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="contactChoice3"
            name="winner"
            value="Team 3"
            className=""
          />
          <label htmlFor="contactChoice3">Team 3</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="contactChoice5"
            name="winner"
            value="Tie"
            className=""
          />
          <label htmlFor="contactChoice5">Tie</label>
        </div>
      </div>
    </fieldset>
  );
}
