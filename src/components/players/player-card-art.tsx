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
import { formatCoinAmount } from '@/lib/display';
import { cn } from '@/lib/utils';

export function PlayerCardArt({
  id,
  kinds,
  rating,
  position,
  auctionable,
  displayName,
  playStyles,
  price,
  nameColor = '#FFFFFF',
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
  /** Star Signings buy price drawn on the card, matching RenderZ. */
  price?: number;
  /** RenderZ `animation.colors.name`, derived from the background template. */
  nameColor?: string;
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
    : { fontSize: Math.max(11, Math.round(size * 0.124)) };
  const positionSize = fill
    ? undefined
    : { fontSize: Math.max(8, Math.round(size * 0.078)) };
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
        'relative shrink-0',
        price === undefined ? 'overflow-hidden' : 'mb-[9%] overflow-visible',
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
        className="pointer-events-none absolute top-[9%] left-[22.5%] z-10 flex flex-col items-center leading-none text-white"
        style={{ textShadow: '0 1px 1px rgba(0,0,0,0.85)' }}
      >
        {rating !== undefined ? (
          <span
            className={cn(
              'font-card font-bold tracking-tight tabular-nums',
              fill && 'text-[clamp(10px,12.4cqw,36px)] leading-none',
            )}
            style={ratingSize}
          >
            {rating}
          </span>
        ) : null}
        {position ? (
          <span
            className={cn(
              'font-card -mt-px font-semibold tracking-[0.02em]',
              fill && 'text-[clamp(7px,7.8cqw,22px)]',
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
          className="pointer-events-none absolute inset-x-[12%] top-[62%] z-10 flex h-[8%] items-center justify-center text-center leading-none"
          style={{ color: nameColor }}
          aria-hidden
        >
          <span
            className={cn(
              'font-card w-full font-bold tracking-[0.01em] uppercase',
              fill ? 'truncate leading-none' : 'line-clamp-2',
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
          className="absolute bottom-[17.2%] left-[32.3%] z-10 h-[9.4%] w-[9.4%]"
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
          className="absolute right-[33.4%] bottom-[17.2%] z-10 h-[9.4%] w-[9.4%]"
        />
      ) : null}
      {price !== undefined ? (
        <div className="pointer-events-none absolute top-[96%] left-1/2 z-20 flex h-[12.5%] -translate-x-1/2 items-center gap-[0.35em] rounded-md bg-[#12141c] px-[0.7em] text-white shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          <PlayerImage
            id={id}
            kind="star-shard"
            alt=""
            width={16}
            height={16}
            hideOnError
            className={cn('shrink-0', fill ? 'size-[1.05em]' : undefined)}
            style={
              fill
                ? undefined
                : {
                    width: Math.max(8, Math.round(size * 0.07)),
                    height: Math.max(8, Math.round(size * 0.07)),
                  }
            }
          />
          <span
            className={cn(
              'font-card leading-none font-semibold tracking-tight tabular-nums',
              fill && 'text-[clamp(8px,7cqw,20px)]',
            )}
            style={
              fill
                ? undefined
                : { fontSize: Math.max(8, Math.round(size * 0.062)) }
            }
          >
            {formatCoinAmount(price)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function cardNameFontSize(size: number, name?: string): number {
  const len = name?.length ?? 0;
  const ratio = len > 16 ? 0.058 : len > 12 ? 0.07 : 0.082;
  return Math.max(7, Math.round(size * ratio));
}

function cardNameFillFont(name?: string): string {
  const len = name?.length ?? 0;
  if (len > 16) return 'clamp(7px, 6.6cqw, 16px)';
  if (len > 12) return 'clamp(8px, 7.4cqw, 20px)';
  return 'clamp(9px, 8.6cqw, 24px)';
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
  const iconPx = Math.max(11, Math.round(size * 0.11));
  const pad = Math.max(2, Math.round(size * 0.016));
  const gap = Math.max(2, Math.round(size * 0.018));
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-[9.4%] left-[3.1%] z-10 flex flex-col items-center rounded border border-white/10 bg-[#111122]/60',
        fill && 'gap-[1.2cqw] px-[3.1cqw] pt-[1.6cqw] pb-[1.2cqw] [&_img]:size-[10.2cqw]',
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
    ? { width: '12.5%' as const, height: '12.5%' as const }
    : { width: size, height: size };

  return (
    <span
      className="pointer-events-none absolute top-0 right-[6.2%] z-20 block"
      style={box}
      title="Untradeable"
    >
      {/* Dark disc so the white RenderZ glyph stays visible on transparent card corners. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[#111122]"
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
