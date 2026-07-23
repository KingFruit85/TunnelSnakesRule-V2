// src/app/ui/ds/buttonStyles.ts
export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  block?: boolean;
  compact?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-600 active:bg-accent-700",
  secondary:
    "bg-canvas text-text border border-divider hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
  ghost:
    "bg-transparent text-text hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]",
};

export function buttonClasses({
  variant = "primary",
  block = false,
  compact = false,
  className = "",
}: ButtonStyleOptions = {}) {
  const sizing = compact ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-3 text-[14.5px]";
  // block/inline-block and text-center/text-left are each mutually exclusive
  // pairs chosen together here (never listed as two separate conditional
  // classes) - two Tailwind utility classes with equal specificity both
  // setting the same CSS property (e.g. both "block" and "inline-block"
  // present at once) resolve by whichever Tailwind happens to emit later in
  // its compiled stylesheet, not by order in the class attribute, so mixing
  // both is a real bug, not a style choice.
  const layout = block ? "block w-full text-center" : "inline-block text-left";
  return [
    layout,
    "font-archivo font-semibold transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    sizing,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
