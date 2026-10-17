import { describe, expect, it } from 'vitest';
import {
  MARKET_REFRESH_PERIOD_SEC,
  currentAlertRefreshAtMs,
  formatMarketRefreshCountdown,
  marketRefreshAtSec,
  refreshAlertPhase,
  sortByNextMarketRefresh,
} from '@/lib/market-refresh';

describe('marketRefreshAtSec', () => {
  it('matches RenderZ Messi refresh (id 24029971 → 2026-09-04T08:59:31Z)', () => {
    const nowMs = Date.parse('2026-09-04T08:20:17.000Z');
    expect(marketRefreshAtSec(24029971, nowMs)).toBe(
      Date.parse('2026-09-04T08:59:31.000Z') / 1000,
    );
  });

  it('differs per player id within the same 2h window', () => {
    const nowMs = Date.parse('2026-09-04T08:20:17.000Z');
    const messi = marketRefreshAtSec(24029971, nowMs);
    const mbappe = marketRefreshAtSec(24044714, nowMs);
    expect(messi).not.toBe(mbappe);
    expect(mbappe - messi).toBeLessThan(MARKET_REFRESH_PERIOD_SEC);
  });

  it('advances to the next cycle after the boundary', () => {
    const at = marketRefreshAtSec(
      24029971,
      Date.parse('2026-09-04T08:20:17.000Z'),
    );
    const after = marketRefreshAtSec(24029971, at * 1000 + 1000);
    expect(after).toBe(at + MARKET_REFRESH_PERIOD_SEC);
  });
});

describe('sortByNextMarketRefresh', () => {
  it('puts the soonest refresh first and players without a market last', () => {
    const nowMs = Date.parse('2026-09-04T08:20:17.000Z');
    const sorted = sortByNextMarketRefresh(
      [
        { id: '24044714', auctionable: true, name: 'Mbappe' },
        { id: '1', auctionable: false, name: 'Untradeable' },
        { id: '24029971', auctionable: true, name: 'Messi' },
      ],
      nowMs,
    );
    expect(sorted.map((player) => player.name)).toEqual([
      'Messi',
      'Mbappe',
      'Untradeable',
    ]);
    expect(marketRefreshAtSec('24029971', nowMs)).toBeLessThan(
      marketRefreshAtSec('24044714', nowMs),
    );
  });
});

describe('refreshAlertPhase', () => {
  const at = Date.parse('2026-10-17T03:13:33.000Z');

  it('stays quiet until five minutes remain', () => {
    expect(refreshAlertPhase(at - 5 * 60 * 1000 - 1, at)).toBe('none');
    expect(refreshAlertPhase(at - 5 * 60 * 1000, at)).toBe('notice');
    expect(refreshAlertPhase(at - 60 * 1000 - 1, at)).toBe('notice');
  });

  it('counts down from one minute before until five seconds after', () => {
    expect(refreshAlertPhase(at - 60 * 1000, at)).toBe('countdown');
    expect(refreshAlertPhase(at, at)).toBe('countdown');
    expect(refreshAlertPhase(at + 5 * 1000, at)).toBe('countdown');
    expect(refreshAlertPhase(at + 5 * 1000 + 1, at)).toBe('none');
  });

  it('keeps the refresh that just passed for the five second hold', () => {
    const playerId = '24029971';
    const refreshAt = marketRefreshAtSec(
      playerId,
      Date.parse('2026-09-04T08:20:17.000Z'),
    );
    const justAfter = refreshAt * 1000 + 3 * 1000;
    expect(marketRefreshAtSec(playerId, justAfter)).toBe(
      refreshAt + MARKET_REFRESH_PERIOD_SEC,
    );
    expect(currentAlertRefreshAtMs(playerId, justAfter)).toBe(refreshAt * 1000);
    expect(currentAlertRefreshAtMs(playerId, refreshAt * 1000 + 6 * 1000)).toBe(
      null,
    );
  });
});

describe('formatMarketRefreshCountdown', () => {
  it('formats minutes and seconds', () => {
    expect(formatMarketRefreshCountdown(42 * 60 + 24)).toBe('in 42m, 24s');
  });

  it('formats hours and minutes', () => {
    expect(formatMarketRefreshCountdown(3660)).toBe('in 1h, 1m');
  });
});
