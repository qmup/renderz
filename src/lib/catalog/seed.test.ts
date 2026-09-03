import { describe, expect, it } from "vitest";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import { seedListingCatalog } from "@/lib/catalog/seed";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import { normalizePlayerListQuery } from "@/lib/catalog/query-engine";
import {
  FakePlayerDataSource,
  fakePlayer,
  fakeSeed,
} from "@/lib/providers/fake-source";

describe("seedListingCatalog", () => {
  it("upserts listing seeds and enriches only discovered ids", async () => {
    const { catalog } = createTestCatalog();
    const source = new FakePlayerDataSource(
      new Map([
        [
          "24029971",
          {
            seed: fakeSeed("24029971", "Messi", 114, "messi"),
            player: fakePlayer({
              id: "24029971",
              name: "Lionel Messi",
              rating: 114,
              slug: "messi",
              position: "ST",
            }),
          },
        ],
        [
          "24044714",
          {
            seed: fakeSeed("24044714", "Mbappe", 120, "mbappe"),
            player: fakePlayer({
              id: "24044714",
              name: "Kylian Mbappe",
              rating: 120,
              slug: "mbappe",
              position: "LW",
            }),
          },
        ],
      ]),
    );

    const result = await seedListingCatalog(catalog, source, { limit: 50 });
    expect(result).toEqual({ discovered: 2, enriched: 2, skipped: 0, failed: 0 });
    expect(source.getPlayerCalls).toEqual(["24029971", "24044714"]);
    expect((await catalog.getById("24029971"))?.position).toBe("ST");
    expect((await catalog.list(normalizePlayerListQuery({ pageSize: 50 }))).total).toBe(2);
  });

  it("skips enrichment when parseVersion is current", async () => {
    const { catalog } = createTestCatalog();
    const detailed = fakePlayer({
      id: "24029971",
      name: "Lionel Messi",
      rating: 114,
      slug: "messi",
      position: "ST",
      parseVersion: CURRENT_PARSE_VERSION,
    });
    await catalog.upsertPlayer(detailed, []);
    const source = FakePlayerDataSource.fromPlayers([detailed]);

    const result = await seedListingCatalog(catalog, source);
    expect(result.skipped).toBe(1);
    expect(result.enriched).toBe(0);
    expect(source.getPlayerCalls).toEqual([]);
  });

  it("continues when one player enrichment fails", async () => {
    const { catalog } = createTestCatalog();
    const source = new FakePlayerDataSource(
      new Map([
        ["1", { seed: fakeSeed("1", "A", 90) }],
        [
          "2",
          {
            seed: fakeSeed("2", "B", 91),
            player: fakePlayer({ id: "2", name: "B", rating: 91, position: "ST" }),
          },
        ],
      ]),
    );
    const result = await seedListingCatalog(catalog, source);
    expect(result.failed).toBe(1);
    expect(result.enriched).toBe(1);
    expect(await catalog.exists("1")).toBe(true);
    expect((await catalog.getById("2"))?.position).toBe("ST");
  });

  it("can seed summaries without fetching details", async () => {
    const { catalog } = createTestCatalog();
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({ id: "1", name: "A", rating: 90 }),
    ]);
    const result = await seedListingCatalog(catalog, source, { enrich: false });
    expect(result.enriched).toBe(0);
    expect(source.getPlayerCalls).toEqual([]);
    expect((await catalog.getById("1"))?.name).toBe("A");
  });

  it("drops enriched players older than three months", async () => {
    const { catalog } = createTestCatalog();
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({
        id: "1",
        name: "Old Card",
        rating: 90,
        addedAt: Date.parse("2026-01-01T00:00:00.000Z"),
      }),
      fakePlayer({
        id: "2",
        name: "New Card",
        rating: 91,
        addedAt: Date.parse("2026-08-01T00:00:00.000Z"),
      }),
    ]);
    const result = await seedListingCatalog(catalog, source, {
      now: Date.parse("2026-09-03T00:00:00.000Z"),
    });
    expect(result.enriched).toBe(2);
    expect(await catalog.getById("1")).toBeNull();
    expect((await catalog.getById("2"))?.name).toBe("New Card");
  });
});
