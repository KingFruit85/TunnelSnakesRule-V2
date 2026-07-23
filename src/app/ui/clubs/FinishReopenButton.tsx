"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endSession, reopenSession } from "@/app/lib/db/sessions-actions";
import Button from "@/app/ui/ds/Button";

export interface FinishReopenButtonProps {
  sessionId: string;
  active: boolean;
  notes: string;
}

export default function FinishReopenButton({ sessionId, active, notes }: FinishReopenButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (active) {
          await endSession(sessionId, notes);
        } else {
          await reopenSession(sessionId);
        }
        router.refresh();
      } catch {
        setError("Something went wrong — try again.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" compact disabled={isPending} onClick={handleClick}>
        {active ? "Finish session" : "Reopen session"}
      </Button>
      {error && <p className="text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
