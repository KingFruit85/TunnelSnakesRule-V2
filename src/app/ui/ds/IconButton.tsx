// src/app/ui/ds/IconButton.tsx
import { ButtonHTMLAttributes } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

export default function IconButton({ className = "", children, ...props }: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center p-2 text-text transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
