"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  catalogUpdateStatusSchema,
  idleCatalogUpdateStatus,
  type CatalogUpdateStatus,
} from "@/lib/catalog/update-status";
import { catalogQueryKeys, playerQueryKeys } from "@/lib/query/keys";

function progressLabel(status: CatalogUpdateStatus): string {
  if (status.phase === "syncing") {
    return status.message ?? "Looking for new player ids";
  }
  if (status.phase === "ingesting") {
    const total = Math.max(status.total, status.processed + status.remaining);
    return `Adding ${status.succeeded}/${total}`;
  }
  if (status.phase === "error") {
    return status.error ?? status.message ?? "Update failed";
  }
  if (status.phase === "done") {
    return status.message ?? "Catalog update finished";
  }
  return "";
}

export function CatalogUpdateControl() {
  const queryClient = useQueryClient();
  const wasRunning = useRef(false);
  const query = useQuery({
    queryKey: catalogQueryKeys.update,
    queryFn: async () => {
      const response = await fetch("/api/catalog/update");
      if (!response.ok) {
        throw new Error("Failed to load catalog update status");
      }
      return catalogUpdateStatusSchema.parse(await response.json());
    },
    refetchInterval: (current) => (current.state.data?.running ? 1500 : false),
  });
  const status = query.data ?? idleCatalogUpdateStatus;

  useEffect(() => {
    if (status.running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current) {
      return;
    }
    wasRunning.current = false;
    void queryClient.invalidateQueries({ queryKey: playerQueryKeys.all });
  }, [queryClient, status.running]);

  async function start() {
    const confirmed = window.confirm(
      "Add new players from the RenderZ sitemap?\n\nExisting cards are left unchanged. Only new ids are fetched, at about 1 request per second. You can keep browsing while it runs.",
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch("/api/catalog/update", { method: "POST" });
    if (!response.ok && response.status !== 409) {
      throw new Error("Failed to start catalog update");
    }
    queryClient.setQueryData(
      catalogQueryKeys.update,
      catalogUpdateStatusSchema.parse(await response.json()),
    );
    await query.refetch();
  }

  const label = progressLabel(status);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {label ? (
        <p
          aria-live="polite"
          className="text-muted-foreground max-w-[16rem] truncate text-xs"
          title={status.error ?? label}
        >
          {label}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={status.running}
        onClick={() => void start()}
      >
        {status.running ? "Adding…" : "Update catalog"}
      </Button>
    </div>
  );
}
