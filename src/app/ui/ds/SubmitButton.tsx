// src/app/ui/ds/SubmitButton.tsx
"use client";
import { useFormStatus } from "react-dom";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface SubmitButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SubmitButton({
  children,
  variant,
  block,
  compact,
  disabled,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={buttonClasses({ variant, block, compact, className })}
    >
      {children}
    </button>
  );
}
