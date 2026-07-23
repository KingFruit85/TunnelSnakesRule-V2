"use client";
import { useState, useTransition } from "react";
import { addPlayerToClub, declineAccessRequest } from "@/app/lib/db/players-actions";
import { Player } from "@/app/lib/definitions";
import InitialSquare from "@/app/ui/ds/InitialSquare";
import Button from "@/app/ui/ds/Button";

function formatRelativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export interface JoinRequestRowProps {
  player: Player;
  clubId: string;
  requestedAt: Date;
}

export default function JoinRequestRow({ player, clubId, requestedAt }: JoinRequestRowProps) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (resolved) return null;

  const handleApprove = () =>
    startTransition(async () => {
      setError(null);
      try {
        await addPlayerToClub(player.externalId, clubId);
        setResolved(true);
      } catch {
        setError("Couldn't approve — it may have already been handled. Refresh and try again.");
      }
    });

  const handleDecline = () =>
    startTransition(async () => {
      setError(null);
      try {
        await declineAccessRequest(player.externalId, clubId);
        setResolved(true);
      } catch {
        setError("Couldn't decline — it may have already been handled. Refresh and try again.");
      }
    });

  return (
    <div className="flex flex-col gap-2 border-b border-divider px-5 py-3">
      <div className="flex items-center gap-3">
        <InitialSquare label={player.name} size={34} variant="neutral" />
        <div className="flex-1">
          <p className="text-[14px] font-medium text-text">{player.name}</p>
          <p className="text-[12px] text-text opacity-55">Requested {formatRelativeTime(requestedAt)}</p>
        </div>
        <Button variant="secondary" compact disabled={isPending} onClick={handleDecline}>
          Decline
        </Button>
        <Button variant="primary" compact disabled={isPending} onClick={handleApprove}>
          Approve
        </Button>
      </div>
      {error && <p className="text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
