// src/app/ui/ds/BackHeader.tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PRESS_SCALE_CLASS } from "./tint";

export interface BackHeaderProps {
  href: string;
  title: string;
  eyebrow?: string;
}

export default function BackHeader({ href, title, eyebrow }: BackHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-divider px-5 py-4">
      <Link
        href={href}
        aria-label="Back"
        className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${PRESS_SCALE_CLASS}`}
      >
        <ChevronLeft size={20} strokeWidth={2} className="text-accent" />
      </Link>
      <div className="flex flex-col">
        {eyebrow && <span className="text-[12.5px] text-text opacity-65">{eyebrow}</span>}
        <h1 className="text-[19px] font-bold text-text">{title}</h1>
      </div>
    </div>
  );
}
