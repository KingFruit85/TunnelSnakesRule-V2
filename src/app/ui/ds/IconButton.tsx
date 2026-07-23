// src/app/ui/ds/IconButton.tsx
import { ButtonHTMLAttributes } from "react";
import { HOVER_TINT_CLASS } from "./tint";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

export default function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      className={`flex h-11 w-11 items-center justify-center p-2 text-text transition-colors ${HOVER_TINT_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
