"use client";

export interface SubmitButtonProps {
  label: string;
}

export default function SubmitButton({ label }: SubmitButtonProps) {
  return (
    <div>
      <button
        type="submit"
        className="text-tunnel-snake-green flex border 
        border-tunnel-snake-green rounded-sm 
        "
      >
        {label}
      </button>
    </div>
  );
}
