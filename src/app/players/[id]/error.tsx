"use client";

import { useEffect } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";

export default function PlayerDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { m } = usePreferences();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {m.playerOpenFailed}
      </h1>
      <p className="text-muted-foreground text-sm">{m.playerOpenFailedBody}</p>
      <Button type="button" onClick={retry} className="w-fit">
        {m.tryAgain}
      </Button>
    </main>
  );
}
