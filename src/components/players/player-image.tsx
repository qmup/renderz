"use client";

import { useState, type CSSProperties } from "react";
import type { PlayerImageKind } from "@/lib/domain/player";
import { playerImageSources } from "@/lib/images";
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
  listThumb = false,
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
  /** List background/card: try the WebP thumb, then the full PNG, then the API. */
  listThumb?: boolean;
}) {
  const sources = playerImageSources(id, kind, listThumb);
  const sourceKey = sources.join("\n");
  const [cursor, setCursor] = useState({ sourceKey, index: 0, failed: false });
  if (cursor.sourceKey !== sourceKey) {
    setCursor({ sourceKey, index: 0, failed: false });
  }
  const index = cursor.sourceKey === sourceKey ? cursor.index : 0;
  const failed = cursor.sourceKey === sourceKey ? cursor.failed : false;
  const src = sources[index] ?? sources[0];
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
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      onError={() => {
        if (index + 1 < sources.length) {
          setCursor({ sourceKey, index: index + 1, failed: false });
          return;
        }
        setCursor({ sourceKey, index, failed: true });
      }}
    />
  );
}
