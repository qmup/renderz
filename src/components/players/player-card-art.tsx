'use client';

import { useLayoutEffect, useRef } from 'react';
import { CardLoopCanvas } from '@/components/players/card-loop-canvas';
import { PlayerImage } from '@/components/players/player-image';
import {
  FM23_CARD_SIZE,
  FM23_LAYOUT,
  FM23_NAME_TRANSFORM,
  fm23BadgeLayout,
  fm23BoxStyle,
  fm23Cqw,
  fm23Pct,
} from '@/lib/catalog/card-layout';
import { cardOvrColors } from '@/lib/catalog/card-name-color';
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
  ratingColor,
  positionColor,
  className,
  size = 96,
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
  /** RenderZ `animation.colors.rating`. Defaults from the name color. */
  ratingColor?: string;
  /** RenderZ `animation.colors.position`. Defaults from the name color. */
  positionColor?: string;
  className?: string;
  size?: number;
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
  const showLeague = has('league');
  const badges = fm23BadgeLayout(showLeague);
  const badge = Math.round((size * FM23_LAYOUT.nation.width) / FM23_CARD_SIZE);
  const cardName = displayName?.trim();
  const ovr = cardOvrColors(nameColor);
  const ratingFill = ratingColor ?? ovr.rating;
  const positionFill = positionColor ?? ovr.position;
  const overlayStyles = sortPlayStylesByLevelDesc(playStyles ?? []).flatMap(
    (style) => {
      const kind = playStyleImageKind(style.id, style.level);
      return kind ? [{ id: style.id, kind }] : [];
    },
  );

  if (!showStack) {
    return (
      <div
        className={cn('bg-muted aspect-square w-full shrink-0 rounded-sm', className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        'relative @container aspect-square w-full shrink-0 antialiased [line-height:1.2]',
        price === undefined ? 'overflow-hidden' : 'mb-[9%] overflow-visible',
        className,
      )}
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

      {rating !== undefined ? (
        <div
          className="font-card pointer-events-none absolute z-10 flex items-center justify-center leading-none font-bold"
          style={{ ...fm23BoxStyle(FM23_LAYOUT.rating), color: ratingFill }}
        >
          {rating}
        </div>
      ) : null}
      {position ? (
        <div
          className="font-card pointer-events-none absolute z-10 flex items-center justify-center text-center leading-none font-bold uppercase"
          style={{ ...fm23BoxStyle(FM23_LAYOUT.position), color: positionFill }}
        >
          {position}
        </div>
      ) : null}

      {overlayStyles.length > 0 ? (
        <PlayStyleRail playerId={id} styles={overlayStyles} size={size} />
      ) : null}

      {cardName ? <CardName name={cardName} color={nameColor} /> : null}

      {auctionable === false ? (
        <UntradeableMark playerId={id} size={size} />
      ) : null}

      {has('flag') ? (
        <PlayerImage
          id={id}
          kind="flag"
          alt=""
          width={badge}
          height={badge}
          hideOnError
          className="absolute z-[11]"
          style={fm23BoxStyle(badges.nation)}
        />
      ) : null}
      {showLeague && badges.league ? (
        <PlayerImage
          id={id}
          kind="league"
          alt=""
          width={badge}
          height={badge}
          hideOnError
          className="absolute z-[11]"
          style={fm23BoxStyle(badges.league)}
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
          className="absolute z-[11]"
          style={fm23BoxStyle(badges.club)}
        />
      ) : null}
      {price !== undefined ? (
        <div
          className="pointer-events-none absolute top-[96%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-[3px] border border-[#3a3a4d] px-2 py-1 text-white"
          style={{
            background: 'linear-gradient(90deg, #112 0%, #212131 100%)',
            fontSize: fm23Cqw(FM23_LAYOUT.price.fontSize),
          }}
        >
          <PlayerImage
            id={id}
            kind="star-shard"
            alt=""
            width={FM23_LAYOUT.price.icon}
            height={FM23_LAYOUT.price.icon}
            hideOnError
            className="size-[1em] shrink-0"
          />
          <span className="font-card leading-none font-medium tracking-tight tabular-nums">
            {formatCoinAmount(price)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function CardName({ name, color }: { name: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent instanceof HTMLElement ? el.offsetParent : el?.parentElement;
    if (!el || !parent) {
      return;
    }

    const fit = () => {
      el.style.transform = FM23_NAME_TRANSFORM;
      const max = parent.clientWidth * (FM23_LAYOUT.name.maxWidth / FM23_CARD_SIZE);
      const width = el.scrollWidth;
      if (width > max && width > 0) {
        el.style.transform = `${FM23_NAME_TRANSFORM} scale(${max / width}, 1)`;
      }
    };

    fit();
    void document.fonts.ready.then(fit);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [name]);

  return (
    <div
      ref={ref}
      className="font-card pointer-events-none absolute z-10 leading-none font-bold whitespace-nowrap uppercase"
      style={{
        left: fm23Pct(FM23_LAYOUT.name.left),
        top: fm23Pct(FM23_LAYOUT.name.top),
        fontSize: fm23Cqw(FM23_LAYOUT.name.fontSize),
        color,
        transform: FM23_NAME_TRANSFORM,
        transformOrigin: 'center bottom',
      }}
      aria-hidden
    >
      {name}
    </div>
  );
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
  const iconPx = Math.max(
    8,
    Math.round((size * FM23_LAYOUT.playStyles.icon) / FM23_CARD_SIZE),
  );
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-center rounded border border-white/15 bg-[#112]/60 backdrop-blur-[2px] [&_img]:size-[12.5cqw]"
      style={{
        top: fm23Pct(FM23_LAYOUT.playStyles.top),
        left: fm23Pct(FM23_LAYOUT.playStyles.left),
        padding: fm23Pct(FM23_LAYOUT.playStyles.padding),
      }}
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
  size,
}: {
  playerId: string;
  size: number;
}) {
  const iconPx = Math.min(32, Math.round((size * 40) / FM23_CARD_SIZE));
  return (
    <span
      className="pointer-events-none absolute top-0 right-2 z-20 block rounded-full bg-[#112] [@container(min-width:205px)]:right-4"
      style={{ width: 'min(15.625cqw, 32px)', height: 'min(15.625cqw, 32px)' }}
      title="Untradeable"
    >
      <PlayerImage
        id={playerId}
        kind="untradeable"
        alt="Untradeable"
        width={iconPx}
        height={iconPx}
        priority
        className="absolute inset-0 h-full w-full object-contain"
      />
    </span>
  );
}
