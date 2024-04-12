"use client";

import { Club, Destination } from "@/app/lib/definitions";
import { useRouter, useSearchParams } from "next/navigation";

export interface SessionRedirectButtonProps {
  destination: Destination;
  label?: string;
  club?: Club;
}

export default function RedirectButton({
  label,
  destination,
  club,
}: SessionRedirectButtonProps) {
  const router = useRouter();
  let buttonLabel = label ? label : undefined;
  let destinationPath = "";

  const searchParams = useSearchParams()
 
  const userId = searchParams.get('user_id') || "";


  switch (destination) {
    case Destination.AddNewClub:
      destinationPath = "/add/club/";
      buttonLabel = "Add new club";
      break;
    case Destination.JoinExistingClub:
      destinationPath = `/join/club?user_id=${userId}`;
      buttonLabel = club?.name;
      break;
    case Destination.ClubSessions:
      destinationPath = `/sessions/?clubId=${club?.id}`;
      break;
    case Destination.AddNewBoardGame:
      destinationPath = `/add/game?clubId=${club?.id}`;
      buttonLabel="Add New Board Game";
      break;
    case Destination.Groups:
      destinationPath = `/sessions/`;
      buttonLabel = "Back To Groups";
      break;

    default:
      break;
  }

  const handleNewSession = () => {
    router.push(destinationPath);
  };

  return (
    <button
      type="button"
      onClick={handleNewSession}
      className="
        w-[90%]
        truncate
        justify-center
        flex 
        gap-2 
        text-tunnel-snake-green 
        border-tunnel-snake-grey 
        px-4 
        py-2 
        bg-tunnel-snake-black 
        rounded-sm 
        border 
        hover:bg-tunnel-snake-orange 
        hover:text-white"
    >
      {buttonLabel}
    </button>
  );
}
