import type { PlayerImageKind } from "@/lib/domain/player";

/** Directory segment under public/player-art (URL-encoded so it matches the static path). */
export function playerArtPublicDir(id: string): string {
  return encodeURIComponent(id);
}

export function playerArtPublicFileName(kind: string): string {
  return `${encodeURIComponent(kind)}.png`;
}

/** Static CDN path extracted from the image cache at build time. */
export function playerArtPublicSrc(id: string, kind: PlayerImageKind): string {
  return `/player-art/${playerArtPublicDir(id)}/${playerArtPublicFileName(kind)}`;
}

export function playerImageApiSrc(id: string, kind: PlayerImageKind): string {
  return `/api/images/player/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`;
}

export function playerImageSrc(id: string, kind: PlayerImageKind): string {
  return playerArtPublicSrc(id, kind);
}
