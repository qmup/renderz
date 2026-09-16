"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { PlayerImageKind } from "@/lib/domain/player";
import { playerArtPublicSrc, playerImageApiSrc } from "@/lib/images";
import { cn } from "@/lib/utils";

export function PlayerImage({
  id,
  kind,
  alt,
  className,
  style,
  width,
  height,
  hideOnError = false,
  priority = false,
}: {
  id: string;
  kind: PlayerImageKind;
  alt: string;
  className?: string;
  style?: CSSProperties;
  width: number;
  height: number;
  hideOnError?: boolean;
  priority?: boolean;
}) {
  const staticSrc = playerArtPublicSrc(id, kind);
  const [src, setSrc] = useState(staticSrc);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(staticSrc);
    setFailed(false);
  }, [staticSrc]);
  if (failed) {
    if (hideOnError) {
      return null;
    }
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center rounded-sm border border-dashed text-[10px]",
          className,
        )}
        style={{ width, height, ...style }}
      >
        No image
      </div>
    );
  }
  return (
    // Static CDN files first; API proxy is same-origin fallback (no RenderZ URLs).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => {
        if (src === staticSrc) {
          setSrc(playerImageApiSrc(id, kind));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
