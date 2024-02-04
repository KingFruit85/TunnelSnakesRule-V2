"use client";

import { useRouter } from "next/navigation";

export interface CancelButtonProps {
  disabled?: boolean;
}

export default function CancelButton({ disabled }: CancelButtonProps) {
  const router = useRouter();

  const handleCancel = () => {
    router.push("/sessions/");
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleCancel}
      className="w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] text-tunnel-snake-orange bg-tunnel-snake-black rounded-sm border border-tunnel-snake-orange py-2 px-4"
    >
      Cancel
    </button>
  );
}
