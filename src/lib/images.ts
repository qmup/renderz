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

export function playerImageApiSrc(id: string, kind: PlayerImageKind): string {
  return `/api/images/player/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`;
}

export function playerImageSrc(id: string, kind: PlayerImageKind): string {
  return playerArtPublicSrc(id, kind);
}
