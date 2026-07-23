// src/app/ui/ds/EmptyState.tsx
export interface EmptyStateProps {
  title: string;
  helper?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, helper, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="text-[20px] font-semibold text-text">{title}</p>
      {helper && <p className="text-[14px] text-text opacity-65">{helper}</p>}
      {action}
    </div>
  );
}
