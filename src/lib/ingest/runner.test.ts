import { describe, expect, it } from "vitest";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import { runIngestBatch, syncIngestQueue } from "@/lib/ingest/runner";
import { fakePlayer, FakePlayerDataSource, fakeSeed } from "@/lib/providers/fake-source";
import { NotFoundError, UpstreamTimeoutError } from "@/lib/http/errors";

describe("ingest runner", () => {
  it("enqueues sitemap ids that are not in the catalog", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertDiscovered(fakeSeed("24029971", "Messi", 114, "messi"));
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({ id: "24029971", name: "Messi", rating: 114, slug: "messi" }),
      fakePlayer({ id: "24044714", name: "Mbappe", rating: 120, slug: "mbappe" }),
    ]);

    const sync = await syncIngestQueue(catalog, source, {
      now: 10_000,
      ttlMs: 24 * 60 * 60 * 1000,
    });
    expect(sync.sitemapEntries).toBe(2);
    expect(sync.discovered).toBe(1);

    const run = await runIngestBatch(catalog, source, { limit: 10, now: 10_000 });
    expect(run.succeeded).toBeGreaterThanOrEqual(1);
    expect((await catalog.getById("24044714"))?.name).toBe("Mbappe");
  });

  it("enqueues refresh for parseVersion below current", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertDiscovered(fakeSeed("1", "Old", 80));
    const updated = fakePlayer({
      id: "1",
      name: "Old Plus",
      slug: "old",
      rating: 81,
      parseVersion: CURRENT_PARSE_VERSION,
    });
    const source = FakePlayerDataSource.fromPlayers([updated]);
    const sync = await syncIngestQueue(catalog, source, { now: Date.now(), ttlMs: 1 });
    expect(sync.refreshes).toBe(1);
    const run = await runIngestBatch(catalog, source, { now: Date.now() + 1_000 });
    expect(run.succeeded).toBe(1);
    expect((await catalog.getById("1"))?.name).toBe("Old Plus");
  });

  it("retries retryable upstream errors", async () => {
    const { catalog } = createTestCatalog();
    const source = new FakePlayerDataSource(new Map());
    source.getPlayer = async () => {
      throw new UpstreamTimeoutError();
    };
    await catalog.enqueueDiscovery("9", "x", 1_000);
    const run = await runIngestBatch(catalog, source, { now: 1_000 });
    expect(run.retried).toBe(1);
    expect(run.failed).toBe(0);
    const claimed = await catalog.claimNext(10, 1_000 + 60_000);
    expect(claimed).toHaveLength(1);
  });

  it("fails permanently on missing upstream pages", async () => {
    const { catalog } = createTestCatalog();
    const source = new FakePlayerDataSource(new Map());
    source.getPlayer = async (id) => {
      throw new NotFoundError(id);
    };
    await catalog.enqueueDiscovery("8", "gone", 1_000);
    const run = await runIngestBatch(catalog, source, { now: 1_000 });
    expect(run.failed).toBe(1);
    expect(await catalog.claimNext(10, 2_000)).toHaveLength(0);
  });

  it("does not keep players added more than three months ago", async () => {
    const { catalog } = createTestCatalog();
    const now = Date.parse("2026-09-03T00:00:00.000Z");
    const old = fakePlayer({
      id: "8",
      name: "Antique",
      rating: 99,
      slug: "antique",
      addedAt: Date.parse("2026-01-01T00:00:00.000Z"),
    });
    const source = FakePlayerDataSource.fromPlayers([old]);
    await catalog.enqueueDiscovery("8", "antique", now);
    const run = await runIngestBatch(catalog, source, { now });
    expect(run.skipped).toBe(1);
    expect(await catalog.getById("8")).toBeNull();
    expect(await catalog.isSkipped("8")).toBe(true);
  });

  it("stops sitemap discovery after a streak of old addedAt cards", async () => {
    const { catalog } = createTestCatalog();
    const now = Date.parse("2026-09-03T00:00:00.000Z");
    const recentAt = Date.parse("2026-08-01T00:00:00.000Z");
    const oldAt = Date.parse("2026-01-01T00:00:00.000Z");
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({
        id: "1",
        name: "Recent",
        rating: 120,
        slug: "recent",
        addedAt: recentAt,
      }),
      fakePlayer({
        id: "2",
        name: "OldA",
        rating: 90,
        slug: "olda",
        addedAt: oldAt,
      }),
      fakePlayer({
        id: "3",
        name: "OldB",
        rating: 90,
        slug: "oldb",
        addedAt: oldAt,
      }),
      fakePlayer({
        id: "4",
        name: "OldC",
        rating: 90,
        slug: "oldc",
        addedAt: oldAt,
      }),
      fakePlayer({
        id: "5",
        name: "OldTail",
        rating: 90,
        slug: "oldtail",
        addedAt: oldAt,
      }),
    ]);

    await syncIngestQueue(catalog, source, { now, ttlMs: 24 * 60 * 60 * 1000 });
    const run = await runIngestBatch(catalog, source, { limit: 10, now });

    expect((await catalog.getById("1"))?.name).toBe("Recent");
    expect(await catalog.getById("5")).toBeNull();
    expect(await catalog.isSkipped("5")).toBe(true);
    expect(source.getPlayerCalls).toEqual(["1", "2", "3", "4"]);
    expect(run.skipped).toBeGreaterThanOrEqual(4);
    expect(await catalog.claimNext(10, now + 1)).toHaveLength(0);
  });

  it("can process discovery jobs without claiming refreshes", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({ id: "1", name: "Keep", rating: 100, slug: "keep" }),
      [],
    );
    await catalog.enqueueRefresh("1", "keep", 1_000);
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({ id: "1", name: "Keep Plus", rating: 101, slug: "keep" }),
      fakePlayer({ id: "2", name: "New", rating: 110, slug: "new" }),
    ]);
    await catalog.enqueueDiscovery("2", "new", 1_000);

    const run = await runIngestBatch(catalog, source, {
      limit: 10,
      now: 1_000,
      consecutiveOldStop: 0,
      kind: "discovery",
    });
    expect(run.succeeded).toBe(1);
    expect(source.getPlayerCalls).toEqual(["2"]);
    expect((await catalog.getById("1"))?.name).toBe("Keep");
    expect((await catalog.getById("2"))?.name).toBe("New");
    expect(await catalog.countOpenIngestJobs("refresh")).toBe(1);
  });
});
