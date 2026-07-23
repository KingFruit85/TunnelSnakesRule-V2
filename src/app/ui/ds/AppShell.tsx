// src/app/ui/ds/AppShell.tsx
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas-page">
      <div className="flex min-h-dvh w-full max-w-[430px] flex-col border-x border-muted-300 bg-canvas">
        {children}
      </div>
    </div>
  );
}
