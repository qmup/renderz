/** FC Mobile market listing refresh cycle (seconds). Matches RenderZ client. */
export const MARKET_REFRESH_PERIOD_SEC = 7200;

/**
 * Next market-refresh instant for a player, in Unix seconds.
 * RenderZ: `id + ceil((nowSec - id) / 7200) * 7200`.
 */
export function marketRefreshAtSec(
  playerId: string | number,
  nowMs = Date.now(),
): number {
  const id = typeof playerId === 'number' ? playerId : Number(playerId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new RangeError('playerId must be a positive number');
  }
  const nowSec = Math.floor(nowMs / 1000);
  return (
    id +
    Math.ceil((nowSec - id) / MARKET_REFRESH_PERIOD_SEC) *
      MARKET_REFRESH_PERIOD_SEC
  );
}

export function marketRefreshAtDate(
  playerId: string | number,
  nowMs = Date.now(),
): Date {
  return new Date(marketRefreshAtSec(playerId, nowMs) * 1000);
}

/** Countdown like RenderZ: `in 42m, 24s` or `in 1h, 46m`. */
export function formatMarketRefreshCountdown(
  remainingSec: number,
): string {
  const sec = Math.max(0, Math.floor(remainingSec));
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `in ${hours}h, ${minutes}m`;
  }
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `in ${minutes}m, ${seconds}s`;
}

export function formatMarketRefreshClock(
  at: Date,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(at);
}
