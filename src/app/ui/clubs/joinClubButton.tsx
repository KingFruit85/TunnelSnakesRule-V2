"use client";

import { requestAccessToClub } from "@/app/lib/actions";
import { ClubAndRequestStatus } from "@/app/lib/definitions";
import { UUID } from "crypto";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export interface JoinClubButtonProps {
  club: ClubAndRequestStatus;
}

export default function JoinClubButton({ club }: JoinClubButtonProps) {
  // const router = useRouter();
  const userId = useSearchParams().get("user_id") as string;

  const requestStatus = club.accessRequestPending
    ? "Requested Access"
    : club.club.name;
  const [buttonText, setButtonText] = useState(requestStatus);

  const buttonHandler = () => {
    if (club.accessRequestPending) return;
    requestAccessToClub(userId, club.club.id as UUID);
    setButtonText("Requested Access");
    // router.push(`/sessions/?clubId=${club.id}`);
  };

  return (
    <button
      type="button"
      disabled={club.accessRequestPending}
      onClick={buttonHandler}
      className="
            flex 
            gap-2 
            text-tunnel-snake-white 
            border-tunnel-snake-white 
            px-4 
            py-2 
            bg-tunnel-snake-black 
            rounded-sm 
            border 
            hover:bg-tunnel-snake-orange 
            hover:text-tunnel-snake-black"
    >
      {buttonText}
    </button>
  );
}
