"use client";

import { useState, type CSSProperties } from "react";
import type { PlayerImageKind } from "@/lib/domain/player";
import { playerImageSrc } from "@/lib/images";
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
  const [failed, setFailed] = useState(false);
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
    // Same-origin proxy; signed CDN URLs never reach the browser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={playerImageSrc(id, kind)}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
    />
  );
}
