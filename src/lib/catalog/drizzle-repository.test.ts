import { describe, expect, it } from "vitest";
import { CURRENT_PARSE_VERSION, SEED_PARSE_VERSION } from "@/lib/catalog/parse-version";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import { normalizePlayerListQuery } from "@/lib/catalog/query-engine";
import { fakePlayer, fakeSeed } from "@/lib/providers/fake-source";
import { parsePlayerId } from "@/lib/domain/player";

describe("DrizzlePlayerCatalog", () => {
  it("lists an empty catalog", async () => {
    const { catalog } = createTestCatalog();
    const result = await catalog.list(normalizePlayerListQuery({}));
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.page).toBe(1);
  });

  it("upserts discovered seeds and filters/sorts/paginates", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertDiscovered(fakeSeed("24029971", "Messi", 114, "messi"));
    await catalog.upsertDiscovered(fakeSeed("24044714", "Mbappe", 120, "mbappe"));
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24029971",
        name: "Messi",
        rating: 114,
        slug: "messi",
        position: "ST",
        programId: "PROGRAM_TOTY26",
        nationName: "Argentina",
        clubName: "Inter Miami CF",
        leagueName: "MLS",
        auctionable: true,
        addedAt: 100,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24044714",
        name: "Mbappe",
        rating: 120,
        slug: "mbappe",
        position: "LW",
        programId: "PROGRAM_TOTS26",
        nationName: "France",
        clubName: "Real Madrid",
        leagueName: "LALIGA",
        auctionable: false,
        addedAt: 200,
      }),
      [],
    );

    const search = await catalog.list(normalizePlayerListQuery({ q: "mess" }));
    expect(search.total).toBe(1);
    expect(search.items[0]?.name).toBe("Messi");

    const byPosition = await catalog.list(
      normalizePlayerListQuery({ filters: { positions: ["LW"] } }),
    );
    expect(byPosition.items.map((row) => row.name)).toEqual(["Mbappe"]);

    const ratingRange = await catalog.list(
      normalizePlayerListQuery({ filters: { ratingMin: 115, ratingMax: 130 } }),
    );
    expect(ratingRange.total).toBe(1);

    const sorted = await catalog.list(
      normalizePlayerListQuery({ sort: "rating_desc" }),
    );
    expect(sorted.items.map((row) => row.rating)).toEqual([120, 114]);

    const page = await catalog.list(
      normalizePlayerListQuery({ page: 2, pageSize: 1, sort: "name_asc" }),
    );
    expect(page.total).toBe(2);
    expect(page.page).toBe(2);
    expect(page.items[0]?.name).toBe("Messi");

    const pastEnd = await catalog.list(
      normalizePlayerListQuery({ page: 9, pageSize: 1 }),
    );
    expect(pastEnd.page).toBe(2);
  });

  it("stores assets without exposing them on the player domain object", async () => {
    const { catalog } = createTestCatalog();
    const player = fakePlayer({
      id: "24029971",
      name: "Messi",
      rating: 114,
      availableImageKinds: ["card"],
    });
    await catalog.upsertPlayer(player, [
      {
        playerId: parsePlayerId("24029971"),
        kind: "card",
        upstreamUrl: "https://images-v2.renderz.app/card",
        fetchedAt: 1,
      },
    ]);
    const loaded = await catalog.getById("24029971");
    expect(loaded).not.toHaveProperty("href");
    expect(JSON.stringify(loaded)).not.toContain("images-v2.renderz.app");
    expect(loaded?.availableImageKinds).toEqual(["card"]);
    const asset = await catalog.getAsset("24029971", "card");
    expect(asset?.upstreamUrl).toContain("images-v2.renderz.app");
  });

  it("claims ingest jobs and recovers expired leases", async () => {
    const { catalog } = createTestCatalog();
    const first = await catalog.enqueueDiscovery("24029971", "messi", 1_000);
    const again = await catalog.enqueueDiscovery("24029971", "messi", 1_000);
    expect(again.id).toBe(first.id);

    const claimed = await catalog.claimNext(10, 1_000, 60_000);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.status).toBe("in_progress");

    const none = await catalog.claimNext(10, 1_001, 60_000);
    expect(none).toHaveLength(0);

    const recovered = await catalog.claimNext(10, 1_000 + 60_001, 60_000);
    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.attempts).toBe(2);

    await catalog.markSucceeded(recovered[0]!.id, 2_000);
    const afterSuccess = await catalog.claimNext(10, 3_000, 60_000);
    expect(afterSuccess).toHaveLength(0);
  });

  it("lists stale players by fetchedAt or parseVersion", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertDiscovered(fakeSeed("1", "Old", 80));
    await catalog.upsertPlayer(
      fakePlayer({
        id: "2",
        name: "Fresh",
        rating: 90,
        fetchedAt: 9_000,
        parseVersion: CURRENT_PARSE_VERSION,
      }),
      [],
    );
    const stale = await catalog.listStalePlayerIds({
      olderThanFetchedAt: 100,
      parseVersionBelow: CURRENT_PARSE_VERSION,
    });
    expect(stale.map(String)).toContain("1");
    expect(stale.map(String)).not.toContain("2");
    const seed = await catalog.getById("1");
    expect(seed?.parseVersion).toBe(SEED_PARSE_VERSION);
  });

  it("creates expected indexes", () => {
    const { sqlite } = createTestCatalog();
    const indexes = sqlite
      .prepare(`select name from sqlite_master where type = 'index'`)
      .all() as Array<{ name: string }>;
    const names = indexes.map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "idx_players_name",
        "idx_players_rating",
        "idx_players_position",
        "idx_players_program_id",
        "idx_players_fetched_at",
        "idx_players_parse_version",
        "idx_ingest_jobs_claim",
        "idx_ingest_jobs_player_kind",
      ]),
    );
  });
});
