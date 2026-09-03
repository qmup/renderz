"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PlayerDetailError({
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Could not open this player
      </h1>
      <p className="text-muted-foreground text-sm">
        The catalog row could not be rendered. Retry, or go back to the listing.
      </p>
      <Button type="button" onClick={retry} className="w-fit">
        Try again
      </Button>
    </main>
  );
}
