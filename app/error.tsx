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
    if (error.message.includes("Failed to load chunk") || error.message.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        Try again
      </button>
    </div>
  );
}
