'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerImageKind } from '@/lib/domain/player';
import { playerImageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

const DEFAULT_FPS = 18;

/**
 * Draws a same-origin LOOP sprite sheet on a canvas (grid, left-to-right,
 * top-to-bottom). Pauses on prefers-reduced-motion (first frame only).
 */
export function CardLoopCanvas({
  playerId,
  kind,
  maxFrames,
  className,
  fps = DEFAULT_FPS,
}: {
  playerId: string;
  kind: PlayerImageKind;
  maxFrames: number;
  className?: string;
  fps?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (failed || maxFrames < 1) {
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
    const frameMs = 1000 / Math.max(1, fps);

    const sheet = new Image();
    sheet.decoding = 'async';

    const drawFrame = (index: number) => {
      const cols = Math.max(1, Math.ceil(Math.sqrt(maxFrames)));
      const rows = Math.max(1, Math.ceil(maxFrames / cols));
      const frameW = sheet.naturalWidth / cols;
      const frameH = sheet.naturalHeight / rows;
      if (!Number.isFinite(frameW) || !Number.isFinite(frameH) || frameW < 1) {
        return;
      }
      const size = Math.round(frameW);
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      const col = index % cols;
      const row = Math.floor(index / cols);
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
        frameIndex = (frameIndex + 1) % maxFrames;
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

    sheet.onload = () => {
      if (cancelled) {
        return;
      }
      drawFrame(0);
      onMotionChange();
    };
    sheet.onerror = () => {
      if (!cancelled) {
        setFailed(true);
      }
    };
    sheet.src = playerImageSrc(playerId, kind);

    media.addEventListener('change', onMotionChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      media.removeEventListener('change', onMotionChange);
      sheet.onload = null;
      sheet.onerror = null;
      sheet.src = '';
    };
  }, [failed, fps, kind, maxFrames, playerId]);

  if (failed) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 h-full w-full', className)}
      aria-hidden
    />
  );
}
