import {
  isSharedImageKind,
  type PlayerImageKind,
} from "@/lib/domain/player";

/** Shared playstyle/trait/untradeable icons live here, not under each player id. */
export const SHARED_PLAYER_ART_DIR = "_shared";

/** Directory segment under public/player-art (URL-encoded so it matches the static path). */
export function playerArtPublicDir(id: string): string {
  return encodeURIComponent(id);
}

export function playerArtPublicFileName(kind: string): string {
  return `${encodeURIComponent(kind)}.png`;
}

/** Static CDN path extracted from the image cache at build time. */
export function playerArtPublicSrc(id: string, kind: PlayerImageKind): string {
  const dir = isSharedImageKind(kind)
    ? SHARED_PLAYER_ART_DIR
    : playerArtPublicDir(id);
  return `/player-art/${dir}/${playerArtPublicFileName(kind)}`;
}

export function playerImageApiSrc(id: string, kind: PlayerImageKind): string {
  return `/api/images/player/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`;
}

export function playerImageSrc(id: string, kind: PlayerImageKind): string {
  return playerArtPublicSrc(id, kind);
}
