export default function CurrentSession() {
  return (
    <div className="w-[60em] h-[286px] flex-col justify-start items-start gap-6 inline-flex">
      <div className="text-white text-[32px] font-semibold font-['Montserrat']">
        Current Session
      </div>
      <div className="self-stretch h-[223px] px-6 py-5 bg-tunnel-snake-black border border-tunnel-snake-orange flex-col justify-start items-start gap-[27px] flex">
        <div className="self-stretch justify-between items-start inline-flex">
          <div className="justify-start items-start gap-4 flex">
            <div className="text-white text-2xl font-semibold font-['Montserrat']">
              31/12/2024
            </div>
            <div className="text-white text-2xl font-normal font-['Montserrat']">
              DBD strikes again
            </div>
          </div>
          <div className="justify-start items-start gap-8 flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                2
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch h-[60px] flex-col justify-start items-start gap-3 flex">
          <div className="self-stretch justify-start items-start gap-2 inline-flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                3
              </div>
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              -
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              Mountains of Madness
            </div>
          </div>
          <div className="self-stretch justify-start items-start gap-2 inline-flex">
            <div className="justify-start items-center gap-2 flex">
              <div className="text-white text-xl font-medium font-['Montserrat']">
                3
              </div>
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              -
            </div>
            <div className="text-white text-xl font-normal font-['Montserrat']">
              Roam
            </div>
          </div>
        </div>
        <div className="justify-start items-start gap-6 inline-flex">
          <div className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex">
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              Add result
            </div>
          </div>
          <div className="px-5 py-2.5 bg-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex">
            <div className="text-tunnel-snake-green text-base font-medium font-['Montserrat']">
              End session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
