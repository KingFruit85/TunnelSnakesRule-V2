"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-black text-white">
      <h2 className="text-center text-2xl">Something went wrong!</h2>
      <button
        className="mt-4 rounded-md bg-tunnel-snake-green px-4 py-2 text-sm text-white transition-colors hover:bg-tunnel-snake-orange"
        onClick={() => reset()}
      >
        Try again
      </button>
    </main>
  );
}
