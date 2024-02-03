"use client";

import { useRouter } from "next/navigation";

export interface CancelButtonProps {
  width: number;
}

export default function CancelButton() {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/sessions/");
  };

  return (
    <button
      type="button"
      onClick={handleCancel}
      className=" text-tunnel-snake-orange bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange py-2 px-4"
    >
      Cancel
    </button>
  );
}
