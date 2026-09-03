"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "4rem 1rem",
          maxWidth: "40rem",
        }}
      >
        <title>App failed to load</title>
        <h1>App failed to load</h1>
        <p>
          The root layout crashed. Retry, and check that SQLite is migrated if this
          is a fresh checkout.
        </p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </body>
    </html>
  );
}
