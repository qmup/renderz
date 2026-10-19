import { describe, expect, it } from "vitest";
import { BASE_PROGRAM_GOLD } from "@/lib/catalog/base-cards";
import {
  programIdsToSync,
  RECENT_REFRESH_LIMIT,
  selectRecentRefreshIds,
} from "@/lib/catalog/sync-plan";
import { SYNC_KEEP_PROGRAM_IDS } from "@/lib/catalog/sync-programs";

const NOW = Date.parse("2026-10-19T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("programIdsToSync", () => {
  it("keeps the known list, then appends a new event once a card is stored", () => {
    const ids = programIdsToSync([
      "PROGRAM_TOTW27",
      "PROGRAM_NEWPROMO28",
      "PROGRAM_NF25",
      BASE_PROGRAM_GOLD,
      "PROGRAM_NEWPROMO28",
    ]);
    expect(ids[0]).toBe("PROGRAM_NEWPROMO28");
    expect(ids.slice(1)).toEqual([...SYNC_KEEP_PROGRAM_IDS]);
    expect(ids).not.toContain("PROGRAM_NF25");
    expect(ids).not.toContain(BASE_PROGRAM_GOLD);
  });
});

describe("selectRecentRefreshIds", () => {
  it("refreshes the stalest promo cards and skips base cards and this run", () => {
    const selected = selectRecentRefreshIds(
      [
        {
          id: "1",
          slug: "fresh",
          addedAt: NOW - DAY,
          fetchedAt: NOW,
          programId: "PROGRAM_TOTW27",
        },
        {
          id: "2",
          slug: "old-promo",
          addedAt: NOW - 40 * DAY,
          fetchedAt: NOW - 10 * DAY,
          programId: "PROGRAM_TOTW27",
        },
        {
          id: "3",
          slug: "stale",
          addedAt: NOW - 2 * DAY,
          fetchedAt: NOW - 2 * DAY,
          programId: "PROGRAM_TOTW27",
        },
        {
          id: "4",
          slug: "newer-fetch",
          addedAt: NOW - 3 * DAY,
          fetchedAt: NOW - DAY,
          programId: "PROGRAM_ANN27",
        },
        {
          id: "5",
          slug: "base",
          addedAt: NOW - DAY,
          fetchedAt: NOW - 5 * DAY,
          programId: BASE_PROGRAM_GOLD,
        },
      ],
      NOW,
      RECENT_REFRESH_LIMIT,
    );
    expect(selected).toEqual([
      { id: "3", slug: "stale" },
      { id: "4", slug: "newer-fetch" },
    ]);
  });
});
