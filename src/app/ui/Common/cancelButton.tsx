"use client"

import { useRouter } from "next/navigation";

export interface CancelButtonProps {
    width: number;
  }

export default function CancelButton({width}:CancelButtonProps) {

    const router = useRouter();

    const handleCancel = () => {
        router.push("/sessions/")
    }

  return (
    <button
        type="button"
      onClick={handleCancel}
      className={`w-[${width}px] px-5 py-2.5 bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange justify-center items-center gap-3 inline-flex`}
    >
      <div className="text-tunnel-snake-orange text-base font-medium font-['Montserrat']">
        Cancel
      </div>
    </button>
  );
}
