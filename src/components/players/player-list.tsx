'use client';

import Link from 'next/link';
import { FollowHeartButton } from '@/components/players/followed-players';
import { PlayerCardArt } from '@/components/players/player-card-art';
import { PlayerGroupedStats } from '@/components/players/player-grouped-stats';
import {
  formatAddedDate,
  formatRefreshClock,
  formatRefreshDate,
} from '@/lib/display';
import { cardDisplayName, type PlayerSummary } from '@/lib/domain/player';
import { marketRefreshAtDate } from '@/lib/market-refresh';
import { cn } from '@/lib/utils';

const listUpdatedColumnClass =
  'hidden w-[6.75rem] shrink-0 text-right lg:block';
const listRefreshColumnClass =
  'hidden w-[7.5rem] shrink-0 text-right lg:block';
const listRefreshMobileClass = 'ml-auto shrink-0 text-right lg:hidden';

function PlayerListHeader() {
  return (
    <div className="text-muted-foreground hidden items-center gap-3 border-b px-3 py-2 text-[10px] font-medium tracking-[0.14em] uppercase lg:flex">
      <span className="min-w-0 flex-1">Player</span>
      <span className="w-[6.75rem] shrink-0 text-right">Updated</span>
      <span className="w-[7.5rem] shrink-0 text-right leading-tight">
        Market refresh
      </span>
    </div>
  );
}

/**
 * Next market listing refresh for auctionable players.
 * Derived from the player id (same RenderZ cycle as the detail card). Not stored.
 */
function nextMarketRefreshAt(
  playerId: string,
  auctionable?: boolean,
): Date | null {
  if (auctionable !== true) {
    return null;
  }
  const id = Number(playerId);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return marketRefreshAtDate(id);
}

function MarketRefreshTime({
  at,
  className,
  clockOnly = false,
}: {
  at: Date | null;
  className: string;
  clockOnly?: boolean;
}) {
  if (!at) {
    return (
      <span
        aria-label="No market refresh"
        className={cn('text-muted-foreground text-xs', className)}
      >
        —
      </span>
    );
  }
  const clock = formatRefreshClock(at);
  const label = clockOnly
    ? `Next market refresh, ${clock}`
    : `Next market refresh, ${formatRefreshDate(at)} ${clock}`;
  return (
    <time
      dateTime={at.toISOString()}
      suppressHydrationWarning
      aria-label={label}
      className={cn(
        'text-muted-foreground text-xs leading-tight whitespace-nowrap tabular-nums',
        className,
      )}
    >
      {clockOnly ? (
        clock
      ) : (
        <>
          <span className="block">{formatRefreshDate(at)}</span>
          <span className="block">{clock}</span>
        </>
      )}
    </time>
  );
}

function PlayerListLink({ player }: { player: PlayerSummary }) {
  const identity = [player.rating, player.position].filter(Boolean).join(' · ');
  const refreshAt = nextMarketRefreshAt(player.id, player.auctionable);
  return (
    <Link
      href={`/players/${player.id}`}
      className="hover:bg-muted/60 group flex h-20 items-center gap-2 px-2 sm:gap-2.5 sm:px-2.5 md:h-24 md:gap-3 md:px-3"
    >
      <div className="relative size-20 shrink-0 md:size-24">
        <PlayerCardArt
          id={player.id}
          kinds={player.availableImageKinds}
          rating={player.rating}
          position={player.position}
          auctionable={player.auctionable}
          displayName={cardDisplayName(player)}
          playStyles={player.playStyles}
          nameColor={player.nameColor}
          size={80}
        />
        <FollowHeartButton playerId={player.id} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden md:gap-4">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-tight font-medium capitalize md:text-base">
            {cardDisplayName(player)}
          </span>
          <div className="mt-0.5 flex min-w-0 flex-col gap-0.5 overflow-hidden">
            {identity ? (
              <span className="text-muted-foreground text-[11px] tabular-nums sm:text-xs md:text-foreground md:text-sm">
                {identity}
              </span>
            ) : null}
            {player.altPositions.length > 0 ? (
              <span className="text-muted-foreground truncate text-[10px] font-medium italic sm:text-[11px]">
                {player.altPositions.join(' · ')}
              </span>
            ) : null}
          </div>
        </div>
        <MarketRefreshTime
          at={refreshAt}
          className={listRefreshMobileClass}
          clockOnly
        />
        <PlayerGroupedStats
          stats={player.avgStats}
          compact
          className="ml-auto hidden lg:flex"
        />
      </div>
      {player.addedAt != null ? (
        <time
          dateTime={new Date(player.addedAt).toISOString()}
          className={`text-muted-foreground text-xs whitespace-nowrap tabular-nums ${listUpdatedColumnClass}`}
        >
          {formatAddedDate(player.addedAt)}
        </time>
      ) : (
        <span
          className={`text-muted-foreground text-xs ${listUpdatedColumnClass}`}
        >
          —
        </span>
      )}
      <MarketRefreshTime at={refreshAt} className={listRefreshColumnClass} />
    </Link>
  );
}

export function PlayerList({ players }: { players: PlayerSummary[] }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <PlayerListHeader />
      <ul className="divide-border divide-y">
        {players.map((player) => (
          <li key={player.id}>
            <PlayerListLink player={player} />
          </li>
        ))}
      </ul>
    </div>
  );
}
