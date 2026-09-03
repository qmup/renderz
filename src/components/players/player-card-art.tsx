'use client';

import { Hammer } from 'lucide-react';
import { PlayerImage } from '@/components/players/player-image';
import {
  playStyleImageKind,
  type CardPlayStyle,
  type PlayerImageKind,
} from '@/lib/domain/player';
import { cn } from '@/lib/utils';

export function PlayerCardArt({
  id,
  kinds,
  rating,
  position,
  auctionable,
  displayName,
  playStyles,
  className,
  size = 96,
  fill = false,
  priority = false,
}: {
  id: string;
  kinds: string[];
  rating?: number;
  position?: string;
  auctionable?: boolean;
  displayName?: string;
  playStyles?: CardPlayStyle[];
  className?: string;
  size?: number;
  fill?: boolean;
  priority?: boolean;
}) {
  const has = (kind: PlayerImageKind) => kinds.includes(kind);
  const showStack = has('background') || has('card');
  const badge = Math.round(size * 0.135);
  const boxStyle = fill ? undefined : { width: size, height: size };
  const cardName = displayName?.trim();
  const overlayStyles = (playStyles ?? []).flatMap((style) => {
    const kind = playStyleImageKind(style.id);
    return kind ? [{ id: style.id, kind }] : [];
  });

  if (!showStack) {
    return (
      <div
        className={cn(
          'bg-muted shrink-0 rounded-sm',
          fill && 'aspect-square w-full',
          className,
        )}
        style={boxStyle}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden',
        fill && 'aspect-square w-full',
        className,
      )}
      style={boxStyle}
    >
      {has('background') ? (
        <PlayerImage
          id={id}
          kind="background"
          alt=""
          width={size}
          height={size}
          hideOnError
          priority={priority}
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
      {has('card') ? (
        <PlayerImage
          id={id}
          kind="card"
          alt=""
          width={size}
          height={size}
          hideOnError
          priority={priority}
          className="absolute inset-0 h-full w-full"
        />
      ) : null}

      <div
        className="pointer-events-none absolute top-[11%] left-[21%] z-10 flex flex-col items-center leading-none text-white gap-0.5"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
      >
        {rating !== undefined ? (
          <span
            className="font-heading font-bold tabular-nums"
            style={{ fontSize: Math.max(11, Math.round(size * 0.12)) }}
          >
            {rating}
          </span>
        ) : null}
        {position ? (
          <span
            className="font-semibold tracking-wide"
            style={{ fontSize: Math.max(8, Math.round(size * 0.08)) }}
          >
            {position}
          </span>
        ) : null}
      </div>

      {overlayStyles.length > 0 ? (
        <PlayStyleRail playerId={id} styles={overlayStyles} size={size} />
      ) : null}

      {cardName ? (
        <div
          className="pointer-events-none absolute inset-x-[10%] bottom-[23%] z-10 text-center leading-none text-white"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          aria-hidden
        >
          <span
            className="font-heading line-clamp-2 font-bold uppercase"
            style={{
              fontSize: cardNameFontSize(size),
              lineHeight: 1.1,
            }}
          >
            {cardName}
          </span>
        </div>
      ) : null}

      {auctionable === false ? (
        <UntradeableMark
          className="absolute right-[5%] z-10"
          size={Math.max(12, Math.round(size * 0.16))}
        />
      ) : null}

      {has('flag') ? (
        <PlayerImage
          id={id}
          kind="flag"
          alt=""
          width={badge}
          height={badge}
          hideOnError
          className="absolute bottom-[11%] left-[30%] z-10 h-[12%] w-[12%]"
        />
      ) : null}
      {has('club') ? (
        <PlayerImage
          id={id}
          kind="club"
          alt=""
          width={badge}
          height={badge}
          hideOnError
          className="absolute right-[30%] bottom-[11%] z-10 h-[12%] w-[12%]"
        />
      ) : null}
    </div>
  );
}

function cardNameFontSize(size: number): number {
  return Math.max(7, Math.round(size * 0.08));
}

function PlayStyleRail({
  playerId,
  styles,
  size,
}: {
  playerId: string;
  styles: Array<{ id: string; kind: PlayerImageKind }>;
  size: number;
}) {
  const iconPx = Math.max(10, Math.round(size * 0.12));
  const pad = Math.max(2, Math.round(size * 0.018));
  const gap = Math.max(1, Math.round(size * 0.012));
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-10 flex flex-col items-center rounded-sm bg-black/55"
      style={{ padding: pad, gap }}
    >
      {styles.map((style) => (
        <PlayerImage
          key={style.id}
          id={playerId}
          kind={style.kind}
          alt=""
          width={iconPx}
          height={iconPx}
          hideOnError
        />
      ))}
    </div>
  );
}

function UntradeableMark({
  className,
  size,
}: {
  className?: string;
  size: number;
}) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full bg-black/55 text-white',
        className,
      )}
      style={{ width: size, height: size }}
      title="Untradeable"
    >
      <span className="relative flex size-[70%] items-center justify-center">
        <Hammer className="size-full" strokeWidth={2.25} />
        <span className="absolute inset-x-[-10%] top-1/2 h-[2px] -rotate-45 rounded-full bg-red-500" />
      </span>
      <span className="sr-only">Untradeable</span>
    </span>
  );
}
