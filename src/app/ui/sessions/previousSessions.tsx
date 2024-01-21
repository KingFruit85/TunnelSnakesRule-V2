import Link from "next/link";

export default function PreviousSessions() {
  return (
    <div className="w-[60em] h-[692px] flex-col justify-start items-start gap-6 inline-flex">
      <div className="self-stretch justify-between items-start inline-flex">
        <div className="text-white text-[32px] font-semibold font-['Montserrat']">
          History
        </div>
        <div className="px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green justify-start items-center gap-3 flex">
          <Link className="text-tunnel-snake-green text-base font-medium font-['Montserrat']" href={"/sessions/newSession"}>
            New session
          </Link>
        </div>
      </div>
      <div className="self-stretch h-[628px] flex-col justify-start items-start gap-8 flex">
        <div className="self-stretch h-[133px] px-6 pt-5 pb-6 bg-tunnel-snake-black rounded-sm  flex-col justify-start items-start gap-2 flex">
          <div className="self-stretch justify-between items-center inline-flex">
            <div className="text-tunnel-snake-green text-base font-semibold font-['Montserrat']">
              28/01/2023
            </div>
            <div className="justify-start items-start gap-8 flex">
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat']">
                  3
                </div>
              </div>
            </div>
          </div>
          <div className="text-white text-2xl font-normal font-['Montserrat']">
            The one where Dan shows up
          </div>
          <div className="rounded-sm justify-start items-center gap-2 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat'] underline">
              View session
            </div>
          </div>
        </div>
        <div className="self-stretch h-[133px] px-6 pt-5 pb-6 bg-tunnel-snake-black rounded-sm flex-col justify-start items-start gap-2 flex">
          <div className="self-stretch justify-between items-center inline-flex">
            <div className="text-tunnel-snake-green text-base font-semibold font-['Montserrat']">
              28/01/2023
            </div>
            <div className="justify-start items-start gap-8 flex">
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat']">
                  3
                </div>
              </div>
            </div>
          </div>
          <div className="text-white text-2xl font-normal font-['Montserrat']">
            The one where Dan shows up
          </div>
          <div className="rounded-sm justify-start items-center gap-2 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat'] underline">
              View session
            </div>
          </div>
        </div>
        <div className="self-stretch h-[133px] px-6 pt-5 pb-6 bg-tunnel-snake-black rounded-sm flex-col justify-start items-start gap-2 flex">
          <div className="self-stretch justify-between items-center inline-flex">
            <div className="text-tunnel-snake-green text-base font-semibold font-['Montserrat']">
              28/01/2023
            </div>
            <div className="justify-start items-start gap-8 flex">
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat']">
                  3
                </div>
              </div>
            </div>
          </div>
          <div className="text-white text-2xl font-normal font-['Montserrat']">
            The one where Dan shows up
          </div>
          <div className="rounded-sm justify-start items-center gap-2 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat'] underline">
              View session
            </div>
          </div>
        </div>
        <div className="self-stretch h-[133px] px-6 pt-5 pb-6 bg-tunnel-snake-black rounded-sm flex-col justify-start items-start gap-2 flex">
          <div className="self-stretch justify-between items-center inline-flex">
            <div className="text-tunnel-snake-green text-base font-semibold font-['Montserrat']">
              28/01/2023
            </div>
            <div className="justify-start items-start gap-8 flex">
              <div className="justify-start items-center gap-2 flex">
                <div className="text-white text-xl font-medium font-['Montserrat']">
                  3
                </div>
              </div>
            </div>
          </div>
          <div className="text-white text-2xl font-normal font-['Montserrat']">
            The one where Dan shows up
          </div>
          <div className="rounded-sm justify-start items-center gap-2 inline-flex">
            <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat'] underline">
              View session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
