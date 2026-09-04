import { describe, expect, it } from "vitest";
import {
  MARKET_REFRESH_PERIOD_SEC,
  formatMarketRefreshCountdown,
  marketRefreshAtSec,
} from "@/lib/market-refresh";

describe("marketRefreshAtSec", () => {
  it("matches RenderZ Messi refresh (id 24029971 → 2026-09-04T08:59:31Z)", () => {
    const nowMs = Date.parse("2026-09-04T08:20:17.000Z");
    expect(marketRefreshAtSec(24029971, nowMs)).toBe(
      Date.parse("2026-09-04T08:59:31.000Z") / 1000,
    );
  });

  it("differs per player id within the same 2h window", () => {
    const nowMs = Date.parse("2026-09-04T08:20:17.000Z");
    const messi = marketRefreshAtSec(24029971, nowMs);
    const mbappe = marketRefreshAtSec(24044714, nowMs);
    expect(messi).not.toBe(mbappe);
    expect(mbappe - messi).toBeLessThan(MARKET_REFRESH_PERIOD_SEC);
  });

  it("advances to the next cycle after the boundary", () => {
    const at = marketRefreshAtSec(
      24029971,
      Date.parse("2026-09-04T08:20:17.000Z"),
    );
    const after = marketRefreshAtSec(24029971, at * 1000 + 1000);
    expect(after).toBe(at + MARKET_REFRESH_PERIOD_SEC);
  });
});

describe("formatMarketRefreshCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatMarketRefreshCountdown(42 * 60 + 24)).toBe("in 42m, 24s");
  });

  it("formats hours and minutes", () => {
    expect(formatMarketRefreshCountdown(3660)).toBe("in 1h, 1m");
  });
});
