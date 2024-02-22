"use client";

import { addPlayerToClub } from "@/app/lib/actions";
import { Club } from "@/app/lib/definitions";
import { UUID } from "crypto";
import { useRouter, useSearchParams } from "next/navigation";

export interface JoinClubButtonProps {
    club: Club;
  }

export default async function JoinClubButton({club}: JoinClubButtonProps) {

    const router = useRouter();
    const userId = useSearchParams().get('user_id') as string;

    const buttonHandler = async () => {
        await addPlayerToClub(userId, club.id as UUID);
        router.push(`/sessions/?clubId=${club.id}`);
    }

    return (
        <button
            type="button"
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
        
            >{club.name}</button>
    )

}
