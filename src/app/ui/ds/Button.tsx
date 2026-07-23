// src/app/ui/ds/Button.tsx
import { ButtonHTMLAttributes } from "react";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
}

export default function Button({
  variant,
  block,
  compact,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, block, compact, className })} {...props}>
      {children}
    </button>
  );
}
