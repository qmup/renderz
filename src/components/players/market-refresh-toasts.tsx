"use client";

import { useEffect, useState } from "react";
import {
  formatRefreshClock,
  formatRefreshDate,
} from "@/lib/display";
import { cardDisplayName, type PlayerSummary } from "@/lib/domain/player";
import {
  currentAlertRefreshAtMs,
  formatAlertRemaining,
  refreshAlertPhase,
} from "@/lib/market-refresh";

const NOTICE_DISMISS_MS = 6000;
const NOTICE_STORAGE_KEY = "fcvn.market-refresh-notices";

type NoticeToast = {
  key: string;
  playerId: string;
  name: string;
  rating: number;
  refreshAtMs: number;
  remainingLabel: string;
  dismissAt: number;
};

type ToastItem = {
  key: string;
  kind: "notice" | "countdown";
  name: string;
  rating: number;
  refreshAtMs: number;
  remainingLabel: string;
};

const liveNotices = new Map<string, NoticeToast>();

function readNotified(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTICE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value) => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function writeNotified(keys: Set<string>) {
  sessionStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify([...keys]));
}

function playerName(player: PlayerSummary): string {
  return cardDisplayName(player) ?? player.name;
}

function syncNotices(players: readonly PlayerSummary[], now: number): NoticeToast[] {
  const followed = new Set(players.map((player) => player.id));
  for (const [key, notice] of liveNotices) {
    const phase = refreshAlertPhase(now, notice.refreshAtMs);
    if (
      notice.dismissAt <= now ||
      phase !== "notice" ||
      !followed.has(notice.playerId)
    ) {
      liveNotices.delete(key);
    }
  }

  const stored = readNotified();
  let storedChanged = false;
  for (const player of players) {
    if (player.auctionable !== true) {
      continue;
    }
    const refreshAtMs = currentAlertRefreshAtMs(player.id, now);
    if (refreshAtMs == null || refreshAlertPhase(now, refreshAtMs) !== "notice") {
      continue;
    }
    const key = `${player.id}:${Math.floor(refreshAtMs / 1000)}`;
    if (stored.has(key) || liveNotices.has(key)) {
      continue;
    }
    liveNotices.set(key, {
      key,
      playerId: player.id,
      name: playerName(player),
      rating: player.rating,
      refreshAtMs,
      remainingLabel: formatAlertRemaining(refreshAtMs - now),
      dismissAt: now + NOTICE_DISMISS_MS,
    });
    stored.add(key);
    storedChanged = true;
  }
  if (storedChanged) {
    writeNotified(stored);
  }
  return [...liveNotices.values()];
}

function countdownToasts(
  players: readonly PlayerSummary[],
  now: number,
): ToastItem[] {
  const items: ToastItem[] = [];
  for (const player of players) {
    if (player.auctionable !== true) {
      continue;
    }
    const refreshAtMs = currentAlertRefreshAtMs(player.id, now);
    if (refreshAtMs == null || refreshAlertPhase(now, refreshAtMs) !== "countdown") {
      continue;
    }
    items.push({
      key: `${player.id}:${Math.floor(refreshAtMs / 1000)}`,
      kind: "countdown",
      name: playerName(player),
      rating: player.rating,
      refreshAtMs,
      remainingLabel: formatAlertRemaining(refreshAtMs - now),
    });
  }
  return items;
}

export function MarketRefreshToasts({ ids }: { ids: readonly string[] }) {
  const idsKey = ids.join(",");
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [notices, setNotices] = useState<NoticeToast[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!idsKey) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/players/by-ids?ids=${idsKey}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load followed players");
        }
        return response.json() as Promise<{ items: PlayerSummary[] }>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlayers(data.items);
        }
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        if (!controller.signal.aborted) {
          setPlayers([]);
        }
      });
    return () => controller.abort();
  }, [idsKey]);

  useEffect(() => {
    const next = syncNotices(players, now);
    setNotices((current) => {
      if (
        current.length === next.length &&
        current.every(
          (item, index) =>
            item.key === next[index]?.key &&
            item.dismissAt === next[index]?.dismissAt,
        )
      ) {
        return current;
      }
      return next;
    });
  }, [now, players]);

  const followed = new Set(ids);
  const visiblePlayers = players.filter((player) => followed.has(player.id));
  const items: ToastItem[] = [
    ...countdownToasts(visiblePlayers, now),
    ...notices
      .filter((notice) => followed.has(notice.playerId))
      .map(
        (notice): ToastItem => ({
          key: notice.key,
          kind: "notice",
          name: notice.name,
          rating: notice.rating,
          refreshAtMs: notice.refreshAtMs,
          remainingLabel: notice.remainingLabel,
        }),
      ),
  ].sort((a, b) => a.refreshAtMs - b.refreshAtMs);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {items.map((item) => {
        const refreshAt = new Date(item.refreshAtMs);
        return (
          <div
            key={item.key}
            role="status"
            aria-live={item.kind === "countdown" ? "off" : "polite"}
            className="bg-background text-foreground rounded-lg border px-3 py-2.5 shadow-lg"
          >
            <p className="text-sm font-medium">
              {item.name}
              <span className="text-muted-foreground ml-1.5 tabular-nums">
                {item.rating}
              </span>
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {formatRefreshDate(refreshAt)} {formatRefreshClock(refreshAt)}
            </p>
            <p className="mt-1 text-sm tabular-nums">{item.remainingLabel}</p>
          </div>
        );
      })}
    </div>
  );
}
