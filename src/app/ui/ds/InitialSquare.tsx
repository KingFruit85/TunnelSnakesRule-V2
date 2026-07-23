// src/app/ui/ds/InitialSquare.tsx
export type InitialSquareVariant = "accent" | "accentTint" | "neutral";

const VARIANT_CLASSES: Record<InitialSquareVariant, string> = {
  accent: "bg-accent text-white",
  accentTint: "bg-accent-200 text-accent-800",
  neutral: "bg-muted-300 text-text",
};

export interface InitialSquareProps {
  label: string;
  size?: number;
  variant?: InitialSquareVariant;
}

export default function InitialSquare({ label, size = 44, variant = "accent" }: InitialSquareProps) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-archivo font-bold ${VARIANT_CLASSES[variant]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </span>
  );
}
