"use client";

import { ClubContext } from "@/app/sessions/Contexts";
import { useRouter } from "next/navigation";
import { useContext } from "react";

export default function NewSessionButton() {
  const router = useRouter();

  const clubId = useContext(ClubContext);

  const handleNewSession = () => {
    router.push(`/sessions/newSession/?clubId=${clubId}`);
  };

  return (
    <button
      type="button"
      onClick={handleNewSession}
      className="flex inline-flex gap-2 text-tunnel-snake-green px-4 py-2 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green "
    >
      <img src="ButtonPlus.svg" alt="Add new session" className="py-1" />
      Add new session
    </button>
  );
}
