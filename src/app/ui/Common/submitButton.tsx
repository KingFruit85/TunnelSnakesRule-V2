"use client";

export interface SubmitButtonProps {
  label: string;
  disabled?: boolean;
}

export default function SubmitButton({ label, disabled }: SubmitButtonProps) {
  return (
      <button
        type="submit"
        disabled={disabled}
        className="w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] text-tunnel-snake-green bg-tunnel-snake-black rounded-sm border border-tunnel-snake-green py-2 px-4"
    
      >
        {label}
      </button>
  );
}
