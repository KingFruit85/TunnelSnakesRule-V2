"use client";

import { Destination } from "@/app/lib/definitions";
import { useRouter } from "next/navigation";

export interface PageRedirectButton {
  destination: Destination;
  userId?: string | null;
  clubId?: string | null;
}

export default function PageRedirectButton({
  destination,
  userId,
  clubId,
}: PageRedirectButton) {
  const router = useRouter();
  let buttonLabel = "";
  let destinationPath = "";

  switch (destination) {
    case Destination.AddNewClub:
      destinationPath = "/add/club/";
      buttonLabel = "Add new club";
      break;
    case Destination.JoinExistingClub:
      destinationPath = `/join/club?user_id=${userId}`;
      buttonLabel = "Join existing club";
      break;
    case Destination.ClubSessions:
      destinationPath = "/sessions/[club_id]";
      break;
    case Destination.ReviewAceessRequests:
      destinationPath = `/requests?userid=${userId}&clubid=${clubId}`;
      buttonLabel = "! New group access requests !";
      break;
    case Destination.PlayerProfile:
      destinationPath = `/players?userid=${userId}`;

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
        text-tunnel-snake-white 
        border-tunnel-snake-green 
        px-4 
        py-2 
        bg-tunnel-snake-black 
        rounded-sm 
        border 
        hover:bg-tunnel-snake-green 
        hover:text-tunnel-snake-black"
    >
      {buttonLabel}
    </button>
  );
}
