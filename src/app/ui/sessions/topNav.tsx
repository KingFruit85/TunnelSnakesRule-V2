"use client"

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from "next/navigation";

const TopNav: React.FC = () => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLImageElement>(null);

  const [screenSize, setScreenSize] = useState('md'); // Default size

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) {
        setScreenSize('sm');
      } else if (screenWidth < 768) {
        setScreenSize('md');
      } else if (screenWidth < 1024) {
        setScreenSize('lg');
      } else {
        setScreenSize('xl');
      }
    };

    handleResize(); // Initial call to set the initial size

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getTextContent = () => {
    switch (screenSize) {
      case 'sm':
        return 'TunnelSnakesRule';
      case 'md':
        return 'Tunnel Snakes Rule';
      case 'lg':
        return 'Tunnel Snakes Rule';
      case 'xl':
        return 'Tunnel Snakes Rule';
      default:
        return 'Tunnel Snakes Rule';
    }
  };

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
          width={20}
          height={20}
          onClick={handlePopoverToggle}
          className="cursor-pointer"
          ref={buttonRef}
        />
        <div className="text-2xl md:text-3xl lg:text-3xl xl:text-3xl text-center font-montserrat">
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

      <div className="grow shrink basis-0 h-14 pr-5 justify-center items-center gap-2 flex ">
        <div className="text-2xl md:text-5xl lg:text-5xl xl:text-5xl text-center font-montserrat">🐍</div>
        <Link
          href="/sessions/"
          className="text-2xl md:text-5xl lg:text-5xl xl:text-5xl text-center font-montserrat"
        >
           {getTextContent()}
        </Link>
        <div className="text-2xl md:text-5xl lg:text-5xl xl:text-5xl text-center font-montserrat">🐍</div>
      </div>
    </div>
  );
};

export default TopNav;
