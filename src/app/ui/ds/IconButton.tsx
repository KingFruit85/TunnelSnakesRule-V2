// src/app/ui/ds/IconButton.tsx
import { ButtonHTMLAttributes } from "react";
import { PRESS_SCALE_CLASS } from "./tint";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

export default function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      className={`flex h-11 w-11 items-center justify-center rounded-full p-2 text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${PRESS_SCALE_CLASS} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
