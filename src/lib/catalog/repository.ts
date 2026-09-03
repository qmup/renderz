import type {
  Player,
  PlayerAssetRow,
  PlayerId,
  PlayerImageKind,
  PlayerSeed,
} from "@/lib/domain/player";
import type { PlayerListQuery, PlayerListResult } from "@/lib/domain/query";

export type IngestJobKind = "discovery" | "refresh";

export type IngestJobStatus =
  | "pending"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "skipped";

export type IngestJob = {
  id: number;
  playerId: PlayerId;
  slug?: string;
  kind: IngestJobKind;
  status: IngestJobStatus;
  attempts: number;
  lastError?: string;
  claimedAt?: number;
  completedAt?: number;
  nextAttemptAt: number;
  createdAt: number;
};

export type StalePlayerCriteria = {
  olderThanFetchedAt?: number;
  parseVersionBelow?: number;
};

export interface PlayerCatalog {
  list(query: PlayerListQuery): Promise<PlayerListResult>;
  getById(id: string): Promise<Player | null>;
  exists(id: string): Promise<boolean>;
  upsertDiscovered(seed: PlayerSeed): Promise<void>;
  upsertPlayer(player: Player, assets: PlayerAssetRow[]): Promise<void>;
  getAsset(playerId: string, kind: PlayerImageKind): Promise<PlayerAssetRow | null>;
  enqueueDiscovery(playerId: string, slug?: string, now?: number): Promise<IngestJob>;
  enqueueRefresh(playerId: string, slug?: string, now?: number): Promise<IngestJob>;
  claimNext(limit: number, now?: number, leaseMs?: number): Promise<IngestJob[]>;
  markSucceeded(jobId: number, now?: number): Promise<void>;
  markFailed(
    jobId: number,
    error: string,
    nextAttemptAt: number,
    now?: number,
  ): Promise<void>;
  listStalePlayerIds(criteria: StalePlayerCriteria): Promise<PlayerId[]>;
}
