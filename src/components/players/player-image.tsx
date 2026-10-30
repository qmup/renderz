"use client";

import { useState, type CSSProperties } from "react";
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
  const [prevStaticSrc, setPrevStaticSrc] = useState(staticSrc);
  if (prevStaticSrc !== staticSrc) {
    setPrevStaticSrc(staticSrc);
    setSrc(staticSrc);
    setFailed(false);
  }
  if (failed) {
    if (hideOnError) {
      return null;
    }
    return (
      <span
        className={cn("inline-block", className)}
        style={{ width, height, ...style }}
        aria-hidden
      />
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
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
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
