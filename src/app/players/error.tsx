"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PlayersError({
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
        Catalog page failed
      </h1>
      <p className="text-muted-foreground text-sm">
        The local catalog could not be rendered. Retry, or run{" "}
        <code className="text-foreground">npm run db:migrate</code> if this is a
        fresh checkout.
      </p>
      <Button type="button" onClick={retry} className="w-fit">
        Try again
      </Button>
    </main>
  );
}
