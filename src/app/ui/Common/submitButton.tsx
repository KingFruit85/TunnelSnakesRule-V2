"use client";

import { useFormStatus } from "react-dom";


export interface SubmitButtonProps {
  label: string;
}

export default function SubmitButton({ label }: SubmitButtonProps) {

  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-[95%] md:w-[95%] lg:w-[95%] xl:w-[95%] sm:w-[95%] 
                  text-tunnel-snake-green bg-tunnel-snake-black 
                  rounded-sm border border-tunnel-snake-green 
                  py-2 px-4 ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );
}
