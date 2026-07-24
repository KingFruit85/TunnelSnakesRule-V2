// src/app/ui/ds/tint.ts
// These must be the COMPLETE Tailwind class-name literals (including the
// hover:/active: prefix and the bg-[...] brackets), not just the bare
// color-mix(...) value. Tailwind's JIT scanner finds classes via a static
// regex scan of the source text - it never evaluates template interpolation,
// so building `bg-[${SOME_BARE_VALUE}]` at a call site produces a class that
// works fine at runtime but has no matching generated CSS rule, since the
// full string never appears literally anywhere in files under Tailwind's
// content glob. Keeping the full class strings here (this file is itself
// inside that glob) is what lets Tailwind find and emit the rules.
export const HOVER_TINT_CLASS = "hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]";
export const ACTIVE_TINT_CLASS = "active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]";

// Combined tint + transition for plain (non-button) interactive elements like
// list-row Links - gives them the same tap feedback LinkButton gets from
// buttonStyles.ts without repeating all three classes at every call site.
export const ROW_TINT_CLASS = `transition-colors ${HOVER_TINT_CLASS} ${ACTIVE_TINT_CLASS}`;

// Same idea for compact icon/nav controls (back button, bottom nav tabs)
// where a scale dip on press reads better than tint alone. transform is
// listed explicitly alongside background-color so this never falls into the
// "transition: all" trap flagged elsewhere in this file.
export const PRESS_SCALE_CLASS = `transition-[background-color,transform] active:scale-[0.96] ${HOVER_TINT_CLASS} ${ACTIVE_TINT_CLASS}`;
