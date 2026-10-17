"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MarketRefreshToasts } from "@/components/players/market-refresh-toasts";
import { Button } from "@/components/ui/button";
import {
  FOLLOWED_PLAYER_IDS_KEY,
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

export function toggleFollowedPlayer(id: string): void {
  const next = toggleFollowedPlayerId(readSnapshot(), id);
  const raw = JSON.stringify(next);
  window.localStorage.setItem(FOLLOWED_PLAYER_IDS_KEY, raw);
  snapshotRaw = raw;
  snapshot = next;
  window.dispatchEvent(new Event(FOLLOW_EVENT));
}

const FollowedPlayersContext = createContext<string[] | null>(null);

export function FollowedPlayersProvider({ children }: { children: ReactNode }) {
  const ids = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  const value = useMemo(() => ids, [ids]);
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
  const followed = ids.includes(playerId);
  return (
    <button
      type="button"
      aria-pressed={followed}
      aria-label={followed ? "Unfollow" : "Follow"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFollowedPlayer(playerId);
      }}
      className={cn(
        "absolute top-1 right-1 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm",
        "motion-safe:transition motion-safe:duration-150 motion-safe:ease-out",
        "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0",
        "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100",
        "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:scale-100 [@media(hover:hover)]:group-focus-within:opacity-100",
      )}
    >
      <Heart
        aria-hidden
        className={cn("size-3.5", followed && "fill-current text-rose-600")}
      />
    </button>
  );
}

export function PlayerFollowButton({ playerId }: { playerId: string }) {
  const ids = useFollowedPlayerIds();
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
      {followed ? "Following" : "Follow"}
    </Button>
  );
}

export function FollowNavLink() {
  const ids = useFollowedPlayerIds();
  return (
    <Link
      href="/players/following"
      className="text-foreground hover:text-foreground/80 inline-flex items-center gap-1.5 text-sm font-medium"
    >
      Following
      {ids.length > 0 ? (
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs tabular-nums">
          {ids.length}
        </span>
      ) : null}
    </Link>
  );
}
