"use client";

import TeamRow from "./teamRow";

export default function TeamBased() {
  return (
    <div className="flex-col justify-start items-start gap-3 flex mt-4">
      <div className="w-[482px] h-[17px] relative">
        <div className="left-0 top-0 absolute text-white text-sm font-medium font-['Montserrat']">
          Team name
        </div>
        <div className="left-[379.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">
          Score
        </div>
        <div className="left-[190.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">
          Players
        </div>
        <div className="left-[470.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">
          Winner
        </div>
      </div>
      <div className="w-[523px] justify-start items-start gap-8 inline-flex">
        <div className="grow shrink basis-0 flex-col justify-start items-start gap-5 inline-flex">
          <div className="h-[137px] flex-col justify-start items-start gap-4 flex">
            <div className="flex-col justify-start items-start gap-5 flex">
              <TeamRow players={[]} />
              <div className="px-4 py-2 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
                <button className="text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">
                  Add team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
