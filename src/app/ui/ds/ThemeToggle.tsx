// src/app/ui/ds/ThemeToggle.tsx
"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import IconButton from "./IconButton";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // resolvedTheme is undefined on first server render; rendering nothing
    // themed until mount avoids a hydration mismatch, same reasoning as
    // next-themes' own suppressHydrationWarning usage in the root layout.
    return <span className="block h-11 w-11" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <IconButton
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
    </IconButton>
  );
}
