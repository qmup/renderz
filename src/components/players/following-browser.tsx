"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerList } from "@/components/players/player-list";
import { useFollowedPlayerIds } from "@/components/players/followed-players";
import type { PlayerSummary } from "@/lib/domain/player";
import { sortByNextMarketRefresh } from "@/lib/market-refresh";
import { Skeleton } from "@/components/ui/skeleton";

export function FollowingBrowser() {
  const ids = useFollowedPlayerIds();
  const [items, setItems] = useState<PlayerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (!idsKey) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/players/by-ids?ids=${idsKey}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load followed players");
        }
        return response.json() as Promise<{ items: PlayerSummary[] }>;
      })
      .then((data) => {
        setItems(data.items);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setError("Could not load followed players.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [idsKey]);

  const visible = sortByNextMarketRefresh(
    ids.flatMap((id) => {
      const item = items.find((player) => player.id === id);
      return item ? [item] : [];
    }),
  );

  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <p className="text-muted-foreground text-sm">
          No followed players yet.
        </p>
        <Link href="/players" className="text-sm font-medium underline-offset-4 hover:underline">
          Browse players
        </Link>
      </div>
    );
  }

  if (error && visible.length === 0) {
    return <p className="text-muted-foreground py-8 text-sm">{error}</p>;
  }

  if (loading && visible.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <PlayerList players={visible} mobileMarketRefresh />;
}
