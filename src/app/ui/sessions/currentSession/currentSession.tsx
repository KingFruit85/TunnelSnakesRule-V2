"use client";

import { endSession } from "@/app/lib/actions";
import { BoardGame, GameSession } from "@/app/lib/definitions";
import { useEffect, useState } from "react";
import CurrentSessionHeader from "./currentSessionHeader";
import CurrentSessionGames from "./currentSessionGames";
import CurrentSessionButtons from "./currentSessionButton";
import CurrentSessionImages from "./currentSessionImages";
import { useSearchParams } from "next/navigation";

export interface currentSessionProps {
  session: GameSession;
  boardgames: BoardGame[];
}

export default function CurrentSession({
  session,
  boardgames,
}: currentSessionProps) {
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showImageUpload, setShowImageUpload] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const clubId = useSearchParams().get("clubId") as string;

  useEffect(() => {
    const notes = localStorage.getItem("sessionNotes");
    if (notes) {
      setNotes(notes);
    }
  }, []);

  const formattedDate = session?.date?.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handleEndSession = () => {
    localStorage.setItem("sessionNotes", "");
    endSession(session.id, notes);
  };

  const handleShowNotes = () => {
    setShowNotes(!showNotes);
  };

  const handleShowImageUpload = () => {
    setShowImageUpload(!showImageUpload);
  };

  const recordNotes = (note: string) => {
    setNotes(note);

    // Clear the specific item related to notes
    localStorage.removeItem("sessionNotes");

    // Append the new note
    localStorage.setItem("sessionNotes", note);
  };

  return (
    <div className="flex-col border border-tunnel-snake-orange bg-black text-white">
      <CurrentSessionHeader
        handleShowNotes={handleShowNotes}
        formattedDate={formattedDate}
        session={session}
        recordNotes={recordNotes}
        notes={notes}
        showNotes={showNotes}
        clubId={clubId}
      />
      <CurrentSessionGames session={session} boardgames={boardgames} />
      <CurrentSessionButtons
        session={session}
        clubId={clubId}
        handleEndSession={handleEndSession}
      />
      {session.imageurl && (
        <CurrentSessionImages
          session={session}
          handleEndSession={handleEndSession}
        />
      )}
    </div>
  );
}
