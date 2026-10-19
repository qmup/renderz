'use client';

import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePreferences } from '@/components/providers/preferences-provider';
import { dateLocale } from '@/lib/i18n/locale';
import {
  formatMarketRefreshClock,
  formatMarketRefreshCountdown,
  marketRefreshAtDate,
} from '@/lib/market-refresh';
import { cn } from '@/lib/utils';

/**
 * Live FC Mobile market-refresh countdown for auctionable players.
 * Time is derived from player id (same formula as RenderZ); no upstream API.
 */
export function MarketRefresh({
  playerId,
  className,
}: {
  playerId: string;
  className?: string;
}) {
  const { locale, m } = usePreferences();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const at = marketRefreshAtDate(playerId, now);
  const remainingSec = Math.max(0, Math.floor((at.getTime() - now) / 1000));

  return (
    <div
      className={cn(
        'bg-card rounded-xl border px-3 py-2.5 text-left',
        className,
      )}
    >
      <p className="text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
        {m.marketRefresh}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium tabular-nums">
        <Timer
          className="text-muted-foreground size-3.5 shrink-0"
          aria-hidden
        />
        <span>{formatMarketRefreshCountdown(remainingSec, locale)}</span>
      </p>
      <p className="text-muted-foreground mt-0.5 pl-5 text-xs tabular-nums">
        {m.atTime(formatMarketRefreshClock(at, dateLocale(locale)))}
      </p>
    </div>
  );
}
