import { loopSheetFileName } from "@/lib/catalog/image-cache";
import {
  isPlayerCardImageKind,
  isPlayerLoopImageKind,
  isSharedImageKind,
} from "@/lib/domain/player";
import {
  SHARED_PLAYER_ART_DIR,
  playerArtPublicDir,
  playerArtPublicFileName,
} from "@/lib/images";

/** S3 object key for one catalog asset. Shared icons use player-art/_shared. */
export function catalogObjectKey(
  playerId: string,
  kind: string,
  upstreamUrl: string,
): string | undefined {
  if (isPlayerLoopImageKind(kind)) {
    const name = loopSheetFileName(upstreamUrl);
    return name ? `loops/${name}` : undefined;
  }
  if (!isPlayerCardImageKind(kind) && !isSharedImageKind(kind)) {
    return undefined;
  }
  const dir = isSharedImageKind(kind)
    ? SHARED_PLAYER_ART_DIR
    : playerArtPublicDir(playerId);
  return `player-art/${dir}/${playerArtPublicFileName(kind)}`;
}

export type CatalogUploadCandidate = {
  playerId: string;
  kind: string;
  upstreamUrl: string;
  fetchedAt: number;
  /** A player ingested in this run. A failed upload should fail the job. */
  required: boolean;
};

export type CatalogUploadJob = {
  key: string;
  upstreamUrl: string;
  required: boolean;
};

/**
 * One upload per object key. Keeps the newest signed URL.
 * An icon is required when any candidate from this run needs it.
 */
export function planCatalogUploads(
  candidates: readonly CatalogUploadCandidate[],
): CatalogUploadJob[] {
  const byKey = new Map<
    string,
    { upstreamUrl: string; fetchedAt: number; required: boolean }
  >();
  for (const candidate of candidates) {
    const key = catalogObjectKey(
      candidate.playerId,
      candidate.kind,
      candidate.upstreamUrl,
    );
    if (!key) {
      continue;
    }
    const existing = byKey.get(key);
    if (!existing || candidate.fetchedAt >= existing.fetchedAt) {
      byKey.set(key, {
        upstreamUrl: candidate.upstreamUrl,
        fetchedAt: candidate.fetchedAt,
        required: candidate.required || existing?.required === true,
      });
      continue;
    }
    if (candidate.required) {
      existing.required = true;
    }
  }
  return [...byKey.entries()].map(([key, job]) => ({
    key,
    upstreamUrl: job.upstreamUrl,
    required: job.required,
  }));
}
