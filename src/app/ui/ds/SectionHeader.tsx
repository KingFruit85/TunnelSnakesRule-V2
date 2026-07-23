// src/app/ui/ds/SectionHeader.tsx
export interface SectionHeaderProps {
  label: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ label, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-t-2 border-divider px-5 pt-4 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">{label}</span>
      {action}
    </div>
  );
}
