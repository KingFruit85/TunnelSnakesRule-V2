"use client";
import { useState } from "react";
import { updateSessionNotes } from "@/app/lib/db/sessions-actions";
import Button from "@/app/ui/ds/Button";

export interface SessionNotesEditorProps {
  sessionId: string;
  initialNotes: string;
}

export default function SessionNotesEditor({ sessionId, initialNotes }: SessionNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSessionNotes(sessionId, notes);
    } catch {
      setError("Couldn't save notes — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-5 pb-4">
      <label htmlFor="sessionNotes" className="sr-only">
        Session notes
      </label>
      <textarea
        id="sessionNotes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="border border-divider bg-surface px-3 py-2.5 text-[14px] text-text"
        placeholder="House rules, memorable moments..."
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary" compact disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save notes"}
        </Button>
        {error && <p className="text-[12px] text-accent-700">{error}</p>}
      </div>
    </div>
  );
}
