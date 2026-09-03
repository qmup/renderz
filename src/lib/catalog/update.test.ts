import { afterEach, describe, expect, it } from "vitest";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import {
  resetCatalogUpdateForTests,
  runCatalogUpdate,
  startCatalogUpdate,
  waitForCatalogUpdate,
} from "@/lib/catalog/update";
import {
  fakePlayer,
  FakePlayerDataSource,
} from "@/lib/providers/fake-source";

const NOW = Date.parse("2026-09-03T00:00:00.000Z");
const RECENT = Date.parse("2026-08-01T00:00:00.000Z");
const OLD = Date.parse("2026-01-01T00:00:00.000Z");

afterEach(() => {
  resetCatalogUpdateForTests();
});

describe("runCatalogUpdate", () => {
  it("adds new sitemap ids only and leaves existing rows untouched", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "1",
        name: "Keep",
        rating: 100,
        slug: "keep",
        addedAt: RECENT,
        fetchedAt: NOW - 48 * 60 * 60 * 1000,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "2",
        name: "Old",
        rating: 90,
        slug: "old",
        addedAt: OLD,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
      [],
    );
    await catalog.enqueueRefresh("1", "keep", NOW);
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({
        id: "1",
        name: "Keep Plus",
        rating: 101,
        slug: "keep",
        addedAt: RECENT,
        fetchedAt: NOW,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
      fakePlayer({
        id: "3",
        name: "New",
        rating: 110,
        slug: "new",
        addedAt: Date.parse("2026-08-20T00:00:00.000Z"),
        fetchedAt: NOW,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
    ]);

    const status = await runCatalogUpdate(catalog, source, NOW);
    expect(status.phase).toBe("done");
    expect(status.running).toBe(false);
    expect(status.pruned).toBe(0);
    expect(status.refreshes).toBe(0);
    expect(status.discovered).toBe(1);
    expect(status.succeeded).toBe(1);
    expect(source.getPlayerCalls).toEqual(["3"]);
    expect((await catalog.getById("1"))?.name).toBe("Keep");
    expect((await catalog.getById("2"))?.name).toBe("Old");
    expect((await catalog.getById("3"))?.name).toBe("New");
    expect(await catalog.countOpenIngestJobs("refresh")).toBe(1);
  });

  it("refuses a second start while an update is running", async () => {
    const { catalog } = createTestCatalog();
    const source = FakePlayerDataSource.fromPlayers([]);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    source.listSitemapEntries = async () => {
      await blocked;
      return [];
    };

    expect(startCatalogUpdate(catalog, source)).toBe(true);
    expect(startCatalogUpdate(catalog, source)).toBe(false);
    release();
    await waitForCatalogUpdate();
  });
});
