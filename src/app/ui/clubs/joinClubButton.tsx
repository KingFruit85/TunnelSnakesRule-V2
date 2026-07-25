"use client";

import { useState, useTransition } from "react";
import { requestAccessToClub } from "@/app/lib/db/players-actions";
import Button from "@/app/ui/ds/Button";

export interface JoinClubButtonProps {
  clubId: string;
  requestPending: boolean;
}

export default function JoinClubButton({ clubId, requestPending }: JoinClubButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(requestPending);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = () =>
    startTransition(async () => {
      setError(null);
      try {
        await requestAccessToClub(clubId);
        setRequested(true);
      } catch {
        setError("Couldn't send request. Try again.");
      }
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" compact disabled={requested || isPending} onClick={handleRequest}>
        {requested ? "Requested" : "Request"}
      </Button>
      {error && <p className="text-[12px] text-accent-700">{error}</p>}
    </div>
  );
}
