import type { PlayerImageKind } from "@/lib/domain/player";

export function playerImageSrc(id: string, kind: PlayerImageKind): string {
  return `/api/images/player/${encodeURIComponent(id)}/${encodeURIComponent(kind)}`;
}
