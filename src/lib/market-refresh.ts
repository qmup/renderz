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

function nextMarketRefreshSec(
  player: { id: string; auctionable?: boolean },
  nowMs: number,
): number {
  if (player.auctionable !== true) {
    return Number.POSITIVE_INFINITY;
  }
  const id = Number(player.id);
  if (!Number.isFinite(id) || id <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return marketRefreshAtSec(id, nowMs);
}

export type RefreshAlertPhase = 'none' | 'notice' | 'countdown';

const NOTICE_WINDOW_MS = 5 * 60 * 1000;
const COUNTDOWN_WINDOW_MS = 60 * 1000;
const COUNTDOWN_AFTER_MS = 5 * 1000;

/**
 * `notice` is the one-shot window (1m, 5m].
 * `countdown` stays up from 1 minute before until 5 seconds after.
 */
export function refreshAlertPhase(
  nowMs: number,
  refreshAtMs: number,
): RefreshAlertPhase {
  const remaining = refreshAtMs - nowMs;
  if (remaining > NOTICE_WINDOW_MS) {
    return 'none';
  }
  if (remaining > COUNTDOWN_WINDOW_MS) {
    return 'notice';
  }
  if (remaining >= -COUNTDOWN_AFTER_MS) {
    return 'countdown';
  }
  return 'none';
}

/**
 * The refresh instant that should drive an alert.
 * After the instant, the next-cycle formula jumps forward two hours,
 * so the cycle that just ended is checked for the 5 second hold.
 */
export function currentAlertRefreshAtMs(
  playerId: string,
  nowMs: number,
): number | null {
  const nextMs = marketRefreshAtSec(playerId, nowMs) * 1000;
  if (refreshAlertPhase(nowMs, nextMs) !== 'none') {
    return nextMs;
  }
  const previousMs = nextMs - MARKET_REFRESH_PERIOD_SEC * 1000;
  if (refreshAlertPhase(nowMs, previousMs) !== 'none') {
    return previousMs;
  }
  return null;
}

/** Remaining time for a toast. Zero once the refresh instant has passed. */
export function formatAlertRemaining(remainingMs: number, locale = 'en'): string {
  const sec = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (locale === 'vi') {
    if (minutes > 0) {
      return `${minutes} phút ${seconds} giây`;
    }
    return `${seconds} giây`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/** Soonest market refresh first. Players without a listing refresh stay last. */
export function sortByNextMarketRefresh<
  T extends { id: string; auctionable?: boolean },
>(players: readonly T[], nowMs = Date.now()): T[] {
  return [...players].sort(
    (a, b) => nextMarketRefreshSec(a, nowMs) - nextMarketRefreshSec(b, nowMs),
  );
}

/** Countdown like RenderZ: `in 42m, 24s` or `in 1h, 46m`. */
export function formatMarketRefreshCountdown(
  remainingSec: number,
  locale = 'en',
): string {
  const sec = Math.max(0, Math.floor(remainingSec));
  if (locale === 'vi') {
    if (sec >= 3600) {
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      return `còn ${hours} giờ ${minutes} phút`;
    }
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `còn ${minutes} phút ${seconds} giây`;
  }
  if (sec >= 3600) {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `in ${hours}h, ${minutes}m`;
  }
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `in ${minutes}m, ${seconds}s`;
}

export function formatMarketRefreshClock(at: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(at);
}
