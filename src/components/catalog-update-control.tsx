"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  catalogUpdateStatusSchema,
  idleCatalogUpdateStatus,
  type CatalogUpdateStatus,
} from "@/lib/catalog/update-status";
import { catalogQueryKeys, playerQueryKeys } from "@/lib/query/keys";

const DAILY_KEY = "catalog-silent-discovery-day";

function localDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function progressLabel(status: CatalogUpdateStatus): string {
  if (status.phase === "syncing") {
    return status.message ?? "Checking for new players…";
  }
  if (status.phase === "ingesting") {
    const total = Math.max(status.total, status.processed + status.remaining);
    return `Adding ${status.succeeded}/${total}`;
  }
  if (status.phase === "error") {
    return status.error ?? status.message ?? "Update failed";
  }
  return "";
}

export function CatalogUpdateControl() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const wasRunning = useRef(false);
  const startedRef = useRef(false);
  const [toastCount, setToastCount] = useState<number | null>(null);

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
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const today = localDayKey();
    if (localStorage.getItem(DAILY_KEY) === today) {
      return;
    }
    localStorage.setItem(DAILY_KEY, today);

    void (async () => {
      const response = await fetch("/api/catalog/update", { method: "POST" });
      if (!response.ok && response.status !== 409) {
        return;
      }
      queryClient.setQueryData(
        catalogQueryKeys.update,
        catalogUpdateStatusSchema.parse(await response.json()),
      );
      await queryClient.invalidateQueries({ queryKey: catalogQueryKeys.update });
    })();
  }, [queryClient]);

  useEffect(() => {
    if (status.running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current) {
      return;
    }
    wasRunning.current = false;
    if (status.phase === "done" && status.succeeded > 0) {
      setToastCount(status.succeeded);
    }
  }, [status.phase, status.running, status.succeeded]);

  function refreshListing() {
    setToastCount(null);
    void queryClient.invalidateQueries({ queryKey: playerQueryKeys.all });
    router.refresh();
  }

  const label = status.running || status.phase === "error" ? progressLabel(status) : "";

  return (
    <>
      {label ? (
        <p
          aria-live="polite"
          className="text-muted-foreground max-w-56 truncate text-right text-xs sm:max-w-72"
          title={status.error ?? label}
        >
          {label}
        </p>
      ) : null}
      {toastCount !== null ? (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <button
            type="button"
            className="border-border bg-background text-foreground shadow-sm hover:bg-muted max-w-sm rounded-md border px-4 py-2.5 text-sm"
            onClick={refreshListing}
          >
            Added {toastCount} player{toastCount === 1 ? "" : "s"} — tap to refresh
          </button>
        </div>
      ) : null}
    </>
  );
}
