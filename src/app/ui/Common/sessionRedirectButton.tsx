"use client";

import { addPlayerToClub } from "@/app/lib/actions";
import { Club, Destination } from "@/app/lib/definitions";
import { UUID } from "crypto";
import { useRouter, useSearchParams } from "next/navigation";

export interface SessionRedirectButtonProps {
  destination: Destination;
  label?: string;
  club: Club;
}

export default function SessionRedirectButton({
  label,
  destination,
  club,
}: SessionRedirectButtonProps) {
  const router = useRouter();
  let buttonLabel = label ? label : "";
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
      buttonLabel = club.name;
      break;
    case Destination.ClubSessions:
      destinationPath = `/sessions/?clubId=${club.id}`;
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
        flex 
        gap-2 
        text-tunnel-snake-orange 
        border-tunnel-snake-green 
        px-4 
        py-2 
        bg-tunnel-snake-black 
        rounded-sm 
        border 
        hover:bg-tunnel-snake-orange 
        hover:text-tunnel-snake-black"
    >
      {buttonLabel}
    </button>
  );
}
