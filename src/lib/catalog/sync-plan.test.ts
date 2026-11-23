import { describe, expect, it } from "vitest";
import { BASE_PROGRAM_GOLD } from "@/lib/catalog/base-cards";
import {
  programIdsToSync,
  programLogoUrlsBySlug,
  RECENT_REFRESH_LIMIT,
  selectDriftedCards,
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

  it("prioritizes brand-new upstream programs before stored and keep-list entries", () => {
    const ids = programIdsToSync(
      ["PROGRAM_STOREDNEW28", "PROGRAM_TOTW27"],
      [
        "PROGRAM_UPSTREAMNEW28",
        "PROGRAM_STOREDNEW28",
        "PROGRAM_RV27",
        "PROGRAM_TOTS25",
        BASE_PROGRAM_GOLD,
      ],
    );
    expect(ids.slice(0, 2)).toEqual([
      "PROGRAM_UPSTREAMNEW28",
      "PROGRAM_STOREDNEW28",
    ]);
    expect(ids.slice(2)).toEqual([...SYNC_KEEP_PROGRAM_IDS]);
    expect(ids).not.toContain("PROGRAM_TOTS25");
    expect(ids).not.toContain(BASE_PROGRAM_GOLD);
  });
});

describe("programLogoUrlsBySlug", () => {
  it("maps resolved program logo slugs to signed upstream URLs", () => {
    const urls = programLogoUrlsBySlug([
      {
        id: "PROGRAM_RV27",
        imageUrl: "https://images-v2.renderz.app/programlogos_23_RV27?verify=1-a",
      },
      {
        id: "PROGRAM_RECORDHOLDERS",
        imageUrl: "https://images-v2.renderz.app/programlogos_23_RECORDHOLDERS26?verify=1-b",
      },
      {
        id: "PROGRAM_NEWPROMO28",
        imageUrl: "https://images-v2.renderz.app/programlogos_23_NEWPROMO28?verify=1-c",
      },
      {
        id: "PROGRAM_RV27",
        imageUrl: "https://images-v2.renderz.app/duplicate",
      },
      { id: "FC_BASE_GOLD", imageUrl: "https://images-v2.renderz.app/ignored" },
      { id: "PROGRAM_EMPTY" },
    ]);

    expect([...urls.entries()]).toEqual([
      ["RV27", "https://images-v2.renderz.app/programlogos_23_RV27?verify=1-a"],
      [
        "RECORDHOLDERS26",
        "https://images-v2.renderz.app/programlogos_23_RECORDHOLDERS26?verify=1-b",
      ],
      [
        "NEWPROMO28",
        "https://images-v2.renderz.app/programlogos_23_NEWPROMO28?verify=1-c",
      ],
    ]);
  });
});

describe("selectDriftedCards", () => {
  it("refreshes stored cards whose OVR or position moved upstream", () => {
    const stored = new Map([
      ["19188567", { slug: "aubameyang", rating: 81, position: "ST" }],
      ["19261278", { slug: "marcos", rating: 91, position: "RWB" }],
      ["24052301", { slug: "bruno", rating: 117, position: "CAM" }],
    ]);
    const drifted = selectDriftedCards(stored, [
      { id: "19188567", slug: "pierre-emerick-aubameyang", rating: 79, position: "ST" },
      { id: "19261278", slug: "marcos", rating: 91, position: "RB" },
      { id: "24052301", slug: "bruno", rating: 117, position: "CAM" },
      { id: "99999999", slug: "not-stored", rating: 90, position: "ST" },
      { id: "19188567", slug: "aubameyang" },
    ]);
    expect(drifted).toEqual([
      { id: "19188567", slug: "aubameyang" },
      { id: "19261278", slug: "marcos" },
    ]);
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
