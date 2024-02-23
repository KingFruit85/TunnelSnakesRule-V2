"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

const TopNav: React.FC = () => {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLImageElement>(null);

  const [screenSize, setScreenSize] = useState("md"); // Default size
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) {
        setScreenSize("sm");
      } else if (screenWidth < 768) {
        setScreenSize("md");
      } else if (screenWidth < 1024) {
        setScreenSize("lg");
      } else {
        setScreenSize("xl");
      }
    };

    handleResize(); // Initial call to set the initial size

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // const getTextContent = () => {
  //   switch (screenSize) {
  //     case "sm":
  //       return "TunnelSnakesRule";
  //     case "md":
  //       return "Tunnel Snakes Rule";
  //     case "lg":
  //       return "Tunnel Snakes Rule";
  //     case "xl":
  //       return "Tunnel Snakes Rule";
  //     default:
  //       return "Tunnel Snakes Rule";
  //   }
  // };

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
    <div className="w-full bg-tunnel-snake-black p-5 space-items items-center gap-5 flex-row inline-flex relative place-content-between">
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
              router.push("/");
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className="flex pl-2 gap-2">
              <Image
                src={"/TrophyWhite.svg"}
                alt={"home icon"}
                height={20}
                width={20}
              />
              <label>Groups</label>
            </div>
          </button>
          <button
            onClick={() => {
              router.push("/add/player");
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className="flex pl-2 gap-2">
              <Image
                src={"/PlayersWhite.svg"}
                alt={"add player icon"}
                height={20}
                width={20}
              />
              <label>Add Player</label>
            </div>
          </button>
          <button
            onClick={() => {
              router.push("/add/game");
              handlePopoverClose();
            }}
            className="border block w-full text-left px-4 py-2 text-white text-base font-normal font-['Montserrat'] hover:bg-tunnel-snake-orange"
          >
            <div className="flex pl-2 gap-2">
              <Image
                src={"/DiceWhite.svg"}
                alt={"add game icon"}
                height={20}
                width={20}
              />
              <label>Add Boardgame</label>
            </div>
          </button>
        </div>
      )}
      {isLoaded && userId && (
        <div className="text-tunnel-snake-orange bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange py-2 px-4 hover:bg-red-500 hover:text-white hover:border-white">
        <SignOutButton /> 
        </div>
      )}
    </div>
  );
};

export default TopNav;
