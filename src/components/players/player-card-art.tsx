'use client';

import { CardLoopCanvas } from '@/components/players/card-loop-canvas';
import { PlayerImage } from '@/components/players/player-image';
import {
  cardLoopMaxFramesFromKind,
  findCardLoopKind,
  playStyleImageKind,
  sortPlayStylesByLevelDesc,
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
  animate = false,
  loopSrc,
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
  /** Detail-only: play LOOP sprite when a loop kind is present. */
  animate?: boolean;
  /** Same-origin static LOOP sheet URL from the catalog sprite name. */
  loopSrc?: string;
}) {
  const has = (kind: PlayerImageKind) => kinds.includes(kind);
  const loopKind = animate ? findCardLoopKind(kinds) : undefined;
  const loopFrames = loopKind ? cardLoopMaxFramesFromKind(loopKind) : undefined;
  const showLoop =
    loopKind !== undefined && loopFrames !== undefined && loopFrames > 0;
  const showStack = has('background') || has('card') || showLoop;
  const showBackground = has('background');
  const badge = Math.round(size * 0.135);
  const boxStyle = fill ? undefined : { width: size, height: size };
  const cardName = displayName?.trim();
  const overlayStyles = sortPlayStylesByLevelDesc(playStyles ?? []).flatMap(
    (style) => {
      const kind = playStyleImageKind(style.id, style.level);
      return kind ? [{ id: style.id, kind }] : [];
    },
  );
  const ratingSize = fill
    ? undefined
    : { fontSize: Math.max(11, Math.round(size * 0.105) + 2) };
  const positionSize = fill
    ? undefined
    : { fontSize: Math.max(8, Math.round(size * 0.065) + 2) };
  const nameSize = fill
    ? {
        fontSize: cardNameFillFont(cardName),
        lineHeight: 1,
      }
    : { fontSize: cardNameFontSize(size, cardName), lineHeight: 1.05 };

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
        fill && '@container aspect-square w-full',
        className,
      )}
      style={boxStyle}
    >
      {showBackground ? (
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
      {showLoop && loopKind && loopFrames ? (
        <CardLoopCanvas
          playerId={id}
          kind={loopKind}
          maxFrames={loopFrames}
          src={loopSrc}
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
        className="pointer-events-none absolute top-[10%] left-[20%] z-10 flex flex-col items-center gap-px leading-none text-white"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
      >
        {rating !== undefined ? (
          <span
            className={cn(
              'font-heading font-bold tabular-nums',
              fill &&
                'text-[clamp(6px,11cqw,15px)] @[7rem]:text-[clamp(8px,13cqw,17px)]',
            )}
            style={ratingSize}
          >
            {rating}
          </span>
        ) : null}
        {position ? (
          <span
            className={cn(
              'font-semibold tracking-wide',
              fill &&
                'text-[clamp(4.5px,7cqw,10px)] @[7rem]:text-[clamp(6.5px,9cqw,12px)]',
            )}
            style={positionSize}
          >
            {position}
          </span>
        ) : null}
      </div>

      {overlayStyles.length > 0 ? (
        <PlayStyleRail
          playerId={id}
          styles={overlayStyles}
          size={size}
          fill={fill}
        />
      ) : null}

      {cardName ? (
        <div
          className="pointer-events-none absolute inset-x-[12%] bottom-[24%] z-10 flex h-[12%] items-center justify-center text-center leading-none text-white"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
          aria-hidden
        >
          <span
            className={cn(
              'font-heading w-full font-bold uppercase',
              fill ? 'truncate leading-none tracking-tight' : 'line-clamp-2',
            )}
            style={nameSize}
          >
            {cardName}
          </span>
        </div>
      ) : null}

      {auctionable === false ? (
        <UntradeableMark
          playerId={id}
          fill={fill}
          size={Math.max(16, Math.round(size * 0.2))}
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

function cardNameFontSize(size: number, name?: string): number {
  const len = name?.length ?? 0;
  const ratio = len > 16 ? 0.052 : len > 12 ? 0.058 : 0.062;
  return Math.max(6, Math.round(size * ratio));
}

function cardNameFillFont(name?: string): string {
  const len = name?.length ?? 0;
  if (len > 16) return 'clamp(5.5px, 6.8cqw, 10px)';
  if (len > 12) return 'clamp(6px, 7.6cqw, 11px)';
  return 'clamp(6.5px, 8.5cqw, 12px)';
}

function PlayStyleRail({
  playerId,
  styles,
  size,
  fill,
}: {
  playerId: string;
  styles: Array<{ id: string; kind: PlayerImageKind }>;
  size: number;
  fill: boolean;
}) {
  const iconPx = Math.max(11, Math.round(size * 0.135));
  const pad = Math.max(2, Math.round(size * 0.018));
  const gap = Math.max(1, Math.round(size * 0.014));
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-0 z-10 flex flex-col items-center rounded-sm bg-black/55',
        fill && 'gap-[1.5cqw] p-[2cqw] [&_img]:size-[12.5cqw]',
      )}
      style={fill ? undefined : { padding: pad, gap }}
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
  playerId,
  fill,
  size,
}: {
  playerId: string;
  fill: boolean;
  size: number;
}) {
  const box = fill
    ? { width: '16%' as const, height: '16%' as const }
    : { width: size, height: size };

  return (
    <span
      className="pointer-events-none absolute top-0 right-[3%] z-20 block"
      style={box}
      title="Untradeable"
    >
      {/* Dark disc so the white RenderZ glyph stays visible on transparent card corners. */}
      <span
        aria-hidden
        className="absolute inset-[8%] rounded-full bg-black/80"
      />
      <PlayerImage
        id={playerId}
        kind="untradeable"
        alt="Untradeable"
        width={size}
        height={size}
        priority
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
      />
    </span>
  );
}
