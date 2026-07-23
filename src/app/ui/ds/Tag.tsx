// src/app/ui/ds/Tag.tsx
export type TagVariant = "accent" | "neutral" | "outline";

const VARIANT_CLASSES: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-700",
  neutral: "bg-muted-200 text-text",
  outline: "border border-accent-700 text-accent-700",
};

export interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

export default function Tag({ children, variant = "neutral", className = "" }: TagProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
