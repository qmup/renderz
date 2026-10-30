"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MarketRefreshToasts } from "@/components/players/market-refresh-toasts";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import {
  FOLLOW_SYNC_CODE_KEY,
  FOLLOWED_PLAYER_IDS_KEY,
  mergeFollowedPlayerIds,
  normalizeSyncCode,
  parseFollowedPlayerIds,
  toggleFollowedPlayerId,
} from "@/lib/followed-players";
import { cn } from "@/lib/utils";

const FOLLOW_EVENT = "fcvn-followed-players";
const EMPTY_IDS: string[] = [];

let snapshot: string[] = EMPTY_IDS;
let snapshotRaw: string | null | undefined;

function readSnapshot(): string[] {
  if (typeof window === "undefined") {
    return EMPTY_IDS;
  }
  const raw = window.localStorage.getItem(FOLLOWED_PLAYER_IDS_KEY);
  if (raw === snapshotRaw) {
    return snapshot;
  }
  snapshotRaw = raw;
  snapshot = parseFollowedPlayerIds(raw);
  return snapshot;
}

function subscribe(onStoreChange: () => void): () => void {
  const notify = () => onStoreChange();
  window.addEventListener("storage", notify);
  window.addEventListener(FOLLOW_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(FOLLOW_EVENT, notify);
  };
}

function getServerSnapshot(): string[] {
  return EMPTY_IDS;
}

function writeIds(next: string[]): void {
  const raw = JSON.stringify(next);
  window.localStorage.setItem(FOLLOWED_PLAYER_IDS_KEY, raw);
  snapshotRaw = raw;
  snapshot = next;
  window.dispatchEvent(new Event(FOLLOW_EVENT));
}

export function toggleFollowedPlayer(id: string): void {
  writeIds(toggleFollowedPlayerId(readSnapshot(), id));
  schedulePush();
}

function readSyncCode(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(FOLLOW_SYNC_CODE_KEY);
}

function getServerSyncCode(): string | null {
  return null;
}

function writeSyncCode(code: string | null): void {
  if (code) {
    window.localStorage.setItem(FOLLOW_SYNC_CODE_KEY, code);
  } else {
    window.localStorage.removeItem(FOLLOW_SYNC_CODE_KEY);
  }
  window.dispatchEvent(new Event(FOLLOW_EVENT));
}

export function useFollowSyncCode(): string | null {
  return useSyncExternalStore(subscribe, readSyncCode, getServerSyncCode);
}

type SyncRecord = { code: string; ids: string[]; updatedAt: number };

async function syncRequest(
  path: string,
  init?: RequestInit,
): Promise<SyncRecord | null> {
  const response = await fetch(`/api/follow-sync${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Sync request failed (${response.status})`);
  }
  return (await response.json()) as SyncRecord;
}

function putIds(code: string, ids: string[]): Promise<SyncRecord | null> {
  return syncRequest(`/${code}`, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

const PUSH_DELAY_MS = 500;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let pushInFlight: Promise<unknown> | undefined;

function schedulePush(): void {
  if (!readSyncCode()) {
    return;
  }
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = undefined;
    const code = readSyncCode();
    if (!code) {
      return;
    }
    pushInFlight = putIds(code, readSnapshot())
      .catch(() => undefined)
      .finally(() => {
        pushInFlight = undefined;
      });
  }, PUSH_DELAY_MS);
}

/** Replace local ids with the server copy. Skipped while a local edit is unsent. */
async function pullFromServer(): Promise<void> {
  const code = readSyncCode();
  if (!code || pushTimer || pushInFlight) {
    return;
  }
  const record = await syncRequest(`/${code}`);
  if (pushTimer || pushInFlight || readSyncCode() !== code) {
    return;
  }
  if (!record) {
    writeSyncCode(null);
    return;
  }
  const next = parseFollowedPlayerIds(JSON.stringify(record.ids));
  if (JSON.stringify(next) !== JSON.stringify(readSnapshot())) {
    writeIds(next);
  }
}

/** Start syncing this browser's list under a new code. */
export async function createSyncCode(): Promise<string> {
  const record = await syncRequest("", {
    method: "POST",
    body: JSON.stringify({ ids: readSnapshot() }),
  });
  if (!record) {
    throw new Error("Could not create sync code");
  }
  writeSyncCode(record.code);
  return record.code;
}

/** Join an existing code. Local follows are merged into the shared list. */
export async function linkSyncCode(input: string): Promise<boolean> {
  const code = normalizeSyncCode(input);
  if (!code) {
    return false;
  }
  const record = await syncRequest(`/${code}`);
  if (!record) {
    return false;
  }
  const merged = mergeFollowedPlayerIds(record.ids, readSnapshot());
  const saved = await putIds(code, merged);
  if (!saved) {
    return false;
  }
  writeIds(merged);
  writeSyncCode(code);
  return true;
}

export function unlinkSync(): void {
  clearTimeout(pushTimer);
  pushTimer = undefined;
  writeSyncCode(null);
}

const FollowedPlayersContext = createContext<string[] | null>(null);

export function FollowedPlayersProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  const value = useMemo(() => ids, [ids]);
  const syncCode = useFollowSyncCode();

  useEffect(() => {
    if (!syncCode) {
      return;
    }
    const pull = () => {
      if (document.visibilityState === "visible") {
        pullFromServer().catch(() => undefined);
      }
    };
    pull();
    window.addEventListener("focus", pull);
    document.addEventListener("visibilitychange", pull);
    return () => {
      window.removeEventListener("focus", pull);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [syncCode]);
  return (
    <FollowedPlayersContext.Provider value={value}>
      {children}
      <MarketRefreshToasts ids={ids} />
    </FollowedPlayersContext.Provider>
  );
}

export function useFollowedPlayerIds(): string[] {
  const ids = useContext(FollowedPlayersContext);
  if (!ids) {
    throw new Error("useFollowedPlayerIds must be used within FollowedPlayersProvider");
  }
  return ids;
}

export function FollowHeartButton({ playerId }: { playerId: string }) {
  const ids = useFollowedPlayerIds();
  const { m } = usePreferences();
  const followed = ids.includes(playerId);
  return (
    <button
      type="button"
      aria-pressed={followed}
      aria-label={followed ? m.unfollow : m.follow}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFollowedPlayer(playerId);
      }}
      className={cn(
        // Size from the card container (cqw), not rem, so text zoom does not inflate the hit target over the art.
        "absolute top-[3cqw] right-[3cqw] z-10 flex size-[24cqw] cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm",
        "motion-safe:transition motion-safe:duration-150 motion-safe:ease-out",
        "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0",
        "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100",
        "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:scale-100 [@media(hover:hover)]:group-focus-within:opacity-100",
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-[55%]", followed && "fill-current text-rose-600")}
      />
    </button>
  );
}

export function PlayerFollowButton({ playerId }: { playerId: string }) {
  const ids = useFollowedPlayerIds();
  const { m } = usePreferences();
  const followed = ids.includes(playerId);
  return (
    <Button
      type="button"
      variant={followed ? "secondary" : "default"}
      aria-pressed={followed}
      className="fixed right-4 bottom-4 z-30 shadow-md"
      onClick={() => toggleFollowedPlayer(playerId)}
    >
      <Heart
        aria-hidden
        className={cn("size-3.5", followed && "fill-current text-rose-600")}
      />
      {followed ? m.following : m.follow}
    </Button>
  );
}

export function FollowNavLink() {
  const ids = useFollowedPlayerIds();
  const { m } = usePreferences();
  return (
    <Link
      href="/players/following"
      className="text-foreground hover:text-foreground/80 inline-flex items-center gap-1.5 text-sm font-medium"
    >
      {m.followingNav}
      {ids.length > 0 ? (
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs tabular-nums">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}
