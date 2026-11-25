'use client';

import { useEffect, useRef, useState } from 'react';
import { rankImageKind } from '@/lib/domain/player';
import { playerArtPublicSrc, playerImageApiSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

const RANK_SPRITE_FRAMES = 36;
const RANK_SPRITE_COLS = 6;
const RANK_SPRITE_ROWS = 6;
const RANK_SPRITE_FPS = 18;
/** RenderZ rank sheets are 192×192 (ranks 1–5) or 288×288 (rank 6). */
const MIN_RANK_FRAME_PX = 24;

const RANK_FALLBACK_COLORS: Record<
  number,
  { fill: string; stroke: string; shield?: boolean }
> = {
  1: { fill: '#22c55e', stroke: '#86efac' },
  2: { fill: '#3b82f6', stroke: '#93c5fd' },
  3: { fill: '#a855f7', stroke: '#d8b4fe' },
  4: { fill: '#ef4444', stroke: '#fca5a5' },
  5: { fill: '#f59e0b', stroke: '#fde68a' },
  6: { fill: '#e11d48', stroke: '#fbbf24', shield: true },
};

/**
 * Renders RenderZ's animated 6×6 rank gem sprite (`rank-1`..`rank-6`) via
 * same-origin static CDN or image proxy, with an inline SVG gem fallback.
 */
export function RankSpriteIcon({
  playerId,
  rank,
  size = 32,
  className,
}: {
  playerId: string;
  rank: number;
  size?: number;
  className?: string;
}) {
  const kind = rankImageKind(rank);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [prevKey, setPrevKey] = useState(`${playerId}:${rank}`);
  const currentKey = `${playerId}:${rank}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setFailed(false);
  }

  useEffect(() => {
    if (!kind || failed) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let cancelled = false;
    let raf = 0;
    let frameIndex = 0;
    let lastTs = 0;
    const frameMs = 1000 / RANK_SPRITE_FPS;

    const sheet = new Image();
    sheet.decoding = 'async';

    const drawFrame = (index: number) => {
      const frameW = sheet.naturalWidth / RANK_SPRITE_COLS;
      const frameH = sheet.naturalHeight / RANK_SPRITE_ROWS;
      if (!Number.isFinite(frameW) || !Number.isFinite(frameH) || frameW < 1) {
        return;
      }
      const px = Math.round(frameW);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      const col = index % RANK_SPRITE_COLS;
      const row = Math.floor(index / RANK_SPRITE_COLS);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        sheet,
        col * frameW,
        row * frameH,
        frameW,
        frameH,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    };

    const tick = (ts: number) => {
      if (cancelled) {
        return;
      }
      if (!lastTs) {
        lastTs = ts;
      }
      if (ts - lastTs >= frameMs) {
        lastTs = ts;
        frameIndex = (frameIndex + 1) % RANK_SPRITE_FRAMES;
        drawFrame(frameIndex);
      }
      raf = requestAnimationFrame(tick);
    };

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      lastTs = 0;
      if (media.matches) {
        drawFrame(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const staticSrc = playerArtPublicSrc(playerId, kind);
    const apiSrc = playerImageApiSrc(playerId, kind);
    let triedApiFallback = false;

    sheet.onload = () => {
      if (cancelled) {
        return;
      }
      const frameW = sheet.naturalWidth / RANK_SPRITE_COLS;
      if (!Number.isFinite(frameW) || frameW < MIN_RANK_FRAME_PX) {
        if (!triedApiFallback) {
          triedApiFallback = true;
          sheet.src = apiSrc;
          return;
        }
        setFailed(true);
        return;
      }
      drawFrame(0);
      onMotionChange();
    };

    sheet.onerror = () => {
      if (cancelled) {
        return;
      }
      if (!triedApiFallback) {
        triedApiFallback = true;
        sheet.src = apiSrc;
        return;
      }
      setFailed(true);
    };

    sheet.src = staticSrc;
    media.addEventListener('change', onMotionChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      media.removeEventListener('change', onMotionChange);
      sheet.onload = null;
      sheet.onerror = null;
      sheet.src = '';
    };
  }, [failed, kind, playerId]);

  if (!kind) {
    return null;
  }

  if (failed) {
    const palette = RANK_FALLBACK_COLORS[rank] ?? RANK_FALLBACK_COLORS[1];
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={cn('shrink-0', className)}
        aria-hidden
      >
        {palette.shield ? (
          <polygon
            points="4,6 28,6 24,20 16,28 8,20"
            fill={palette.fill}
            stroke={palette.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : (
          <polygon
            points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5"
            fill={palette.fill}
            stroke={palette.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
