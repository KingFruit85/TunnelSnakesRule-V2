// src/app/ui/ds/LinkButton.tsx
import Link from "next/link";
import { buttonClasses, ButtonVariant } from "./buttonStyles";

export interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LinkButton({
  href,
  children,
  variant,
  block,
  compact,
  className,
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, block, compact, className })}>
      {children}
    </Link>
  );
}
