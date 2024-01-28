export default function TeamBased() {
  return (

    <div className="flex-col justify-start items-start gap-3 flex mt-4">
        <div className="w-[482px] h-[17px] relative">
            <div className="left-0 top-0 absolute text-white text-sm font-medium font-['Montserrat']">Team name</div>
            <div className="left-[379.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">Score</div>
            <div className="left-[190.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">Players</div>
            <div className="left-[470.50px] top-0 absolute text-white text-sm font-medium font-['Montserrat']">Winner</div>
        </div>
        <div className="w-[523px] justify-start items-start gap-8 inline-flex">
            <div className="grow shrink basis-0 flex-col justify-start items-start gap-5 inline-flex">
                <div className="h-[137px] flex-col justify-start items-start gap-4 flex">
                    <div className="flex-col justify-start items-start gap-5 flex">
                        <div className="w-[479px] h-8 relative">
                            <div className="w-[172px] h-8 px-3 py-1.5 left-0 top-0 absolute bg-neutral-900 rounded-sm border border-white" />
                            <div className="w-[172px] h-8 px-3 py-1.5 left-[189.50px] top-0 absolute bg-neutral-900 rounded-sm border border-white justify-start items-center gap-2.5 inline-flex">
                                <div className="grow shrink basis-0 h-[15px] text-white text-xs font-light font-['Montserrat']">Select players...</div>
                            </div>
                            <div className="w-6 h-6 left-[470.50px] top-[5px] absolute bg-neutral-900 rounded-[29px] border border-white" />
                        </div>
                        <div className="w-[479px] h-8 relative">
                            <div className="w-6 left-[216.50px] top-0 absolute" />
                            <div className="w-6 h-6 left-[470.50px] top-[4px] absolute bg-neutral-900 rounded-[29px] border border-white" />
                            <div className="w-[172px] h-8 px-3 py-1.5 left-0 top-0 absolute bg-neutral-900 rounded-sm border border-white" />
                            <div className="w-[172px] h-8 px-3 py-1.5 left-[189.50px] top-0 absolute bg-neutral-900 rounded-sm border border-white justify-end items-center gap-2.5 inline-flex">
                                <div className="grow shrink basis-0 h-[15px] text-white text-xs font-light font-['Montserrat']">Select players...</div>
                            </div>
                            <div className="w-[72px] h-8 px-3 py-1.5 left-[378.50px] top-[-51.50px] absolute bg-neutral-900 rounded-sm border border-white" />
                            <div className="w-[72px] h-8 px-3 py-1.5 left-[379.50px] top-[0.50px] absolute bg-neutral-900 rounded-sm border border-white" />
                        </div>
                        <div className="px-4 py-2 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex">
                            <div className="text-tunnel-snake-orange text-sm font-medium font-['Montserrat']">Add team</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
