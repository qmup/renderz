import {
  isSharedImageKind,
  type PlayerImageKind,
} from "@/lib/domain/player";

/** Shared playstyle/trait/untradeable icons live here, not under each player id. */
export const SHARED_PLAYER_ART_DIR = "_shared";

/** Longest edge of the list-only background/card variant. Detail keeps the PNG. */
export const LIST_THUMB_EDGE = 128;

export const LIST_THUMB_KINDS = ["background", "card"] as const;

export type ListThumbKind = (typeof LIST_THUMB_KINDS)[number];

export function isListThumbKind(kind: string): kind is ListThumbKind {
  return kind === "background" || kind === "card";
}

/** Directory segment under public/player-art (URL-encoded so it matches the static path). */
export function playerArtPublicDir(id: string): string {
  return encodeURIComponent(id);
}

export function playerArtPublicFileName(kind: string): string {
  return `${encodeURIComponent(kind)}.png`;
}

/** New object key. Existing PNG keys stay immutable for a year. */
export function listThumbFileName(kind: string): string {
  return `${encodeURIComponent(kind)}.thumb.webp`;
}

/** `player-art/{id}/card.png` → `player-art/{id}/card.thumb.webp`. */
export function listThumbObjectKey(objectKey: string): string | undefined {
  const match = /^player-art\/([^/]+)\/(background|card)\.png$/.exec(objectKey);
  const dir = match?.[1];
  const kind = match?.[2];
  if (!dir || !kind || dir === SHARED_PLAYER_ART_DIR) {
    return undefined;
  }
  return `player-art/${dir}/${listThumbFileName(kind)}`;
}

/**
 * CloudFront origin. Empty in local/dev so paths stay on this site.
 * The unset branch must read process.env.NEXT_PUBLIC_IMAGE_BASE_URL directly.
 * A dynamic lookup is not inlined into the client bundle, so Back navigation
 * would request /player-art on this origin and fall through to the placeholder.
 */
export function imageCdnBase(env?: NodeJS.ProcessEnv): string {
  const value = env
    ? env.NEXT_PUBLIC_IMAGE_BASE_URL
    : process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  return (value ?? "").trim().replace(/\/$/, "");
}

export function withImageCdn(path: string, env?: NodeJS.ProcessEnv): string {
  const base = imageCdnBase(env);
  return base ? `${base}${path}` : path;
}

/** Static CDN path extracted from the image cache at build time. */
export function playerArtPublicSrc(id: string, kind: PlayerImageKind): string {
  const dir = isSharedImageKind(kind)
    ? SHARED_PLAYER_ART_DIR
    : playerArtPublicDir(id);
  return withImageCdn(`/player-art/${dir}/${playerArtPublicFileName(kind)}`);
}

/** List background and card. Undefined for flags, clubs, and shared icons. */
export function playerArtListThumbSrc(
  id: string,
  kind: PlayerImageKind,
): string | undefined {
  if (!isListThumbKind(kind) || isSharedImageKind(kind)) {
    return undefined;
  }
  return withImageCdn(
    `/player-art/${playerArtPublicDir(id)}/${listThumbFileName(kind)}`,
  );
}

/**
 * CDN thumb (list background/card only), then the full PNG, then the same-origin API.
 * A missing thumb falls through instead of hiding the card.
 */
export function playerImageSources(
  id: string,
  kind: PlayerImageKind,
  listThumb = false,
): readonly string[] {
  const full = playerArtPublicSrc(id, kind);
  const api = playerImageApiSrc(id, kind);
  if (!listThumb) {
    return [full, api];
  }
  const thumb = playerArtListThumbSrc(id, kind);
  return thumb ? [thumb, full, api] : [full, api];
}

export function playerImageApiSrc(id: string, kind: PlayerImageKind): string {
  return `/api/images/player/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`;
}

export function playerImageSrc(id: string, kind: PlayerImageKind): string {
  return playerArtPublicSrc(id, kind);
}
