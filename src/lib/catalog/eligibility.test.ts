import { describe, expect, it } from "vitest";
import {
  catalogAddedAfterCutoff,
  isKnownOldPlayer,
  isRecentCatalogPlayer,
} from "@/lib/catalog/eligibility";

const NOW = Date.parse("2026-09-03T00:00:00.000Z");

describe("recent catalog eligibility", () => {
  it("keeps cards added within three months", () => {
    const addedAt = Date.parse("2026-07-01T00:00:00.000Z");
    expect(isRecentCatalogPlayer({ addedAt }, NOW)).toBe(true);
    expect(isKnownOldPlayer({ addedAt }, NOW)).toBe(false);
  });

  it("rejects cards older than three months", () => {
    const old = Date.parse("2026-05-01T00:00:00.000Z");
    expect(isRecentCatalogPlayer({ addedAt: old }, NOW)).toBe(false);
    expect(isKnownOldPlayer({ addedAt: old }, NOW)).toBe(true);
  });

  it("treats missing addedAt as not yet known", () => {
    expect(isRecentCatalogPlayer({}, NOW)).toBe(false);
    expect(isKnownOldPlayer({}, NOW)).toBe(false);
    expect(catalogAddedAfterCutoff(NOW)).toBe(Date.parse("2026-06-03T00:00:00.000Z"));
  });
});
