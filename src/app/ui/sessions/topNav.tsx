"use client"

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from "next/navigation";

const TopNav: React.FC = () => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLImageElement>(null);

  const router = useRouter();

  const handlePopoverToggle = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setIsPopoverVisible((prev) => !prev);
  };

  const handlePopoverClose = () => {
    setIsPopoverVisible(false);
  };

  return (
    <div className="w-full bg-tunnel-snake-black py-5 space-items items-center gap-5 flex-row inline-flex relative">
      <div className="justify-center items-center gap-2 flex pl-5">
        <Image
          src="/Menu.svg"
          alt="Nav menu button"
          width={40}
          height={40}
          onClick={handlePopoverToggle}
          className="cursor-pointer"
          ref={buttonRef}
        />
        <div className="text-white text-3xl font-medium font-montserrat">
          Menu
        </div>
      </div>

      {isPopoverVisible && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black opacity-50"
          onClick={handlePopoverClose}
        ></div>
      )}

      {isPopoverVisible && (
        <div
          className="absolute bg-tunnel-snake-green shadow-lg w-[15pc]"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <button
            onClick={() => {
              router.push("/sessions/")
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className='flex pl-2 gap-2'>
            <img src={"/TrophyWhite.svg"} alt={"home icon"} />
            <label>Home</label>
            </div>
          </button>
          <button
            onClick={() => {
              router.push("/add/player")
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className='flex pl-2 gap-2'>
            <img src={"/PlayersWhite.svg"} alt={"add player icon"} />
            <label>Add Player</label>
            </div>
          </button>
          <button
            onClick={() => {
              router.push("/add/game")
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className='flex pl-2 gap-2'>
            <img src={"/DiceWhite.svg"} alt={"add game icon"} />
            <label>Add Boardgame</label>
            </div>
          </button>
        </div>
      )}

      <div className="grow shrink basis-0 h-14 pr-5 justify-center items-center gap-5 flex ">
        <div className="text-white text-5xl font-bold font-montserrat">🐍</div>
        <Link
          href="/sessions/"
          className="text-white text-5xl font-bold font-montserrat"
        >
          Tunnel Snakes Rule
        </Link>
        <div className="text-white text-5xl font-bold font-montserrat">🐍</div>
      </div>
    </div>
  );
};

export default TopNav;
