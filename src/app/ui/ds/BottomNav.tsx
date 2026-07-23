// src/app/ui/ds/BottomNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Dices, Users } from "lucide-react";

const TABS = [
  { href: "/clubs", label: "Home", Icon: House },
  { href: "/sessions", label: "Sessions", Icon: Dices },
  { href: "/players", label: "Players", Icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 grid grid-cols-3 border-t-2 border-divider bg-canvas">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-[3px] py-2.5 ${
              active ? "text-accent" : "text-text opacity-55"
            }`}
          >
            <Icon size={20} strokeWidth={2} />
            <span className="text-[10.5px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
