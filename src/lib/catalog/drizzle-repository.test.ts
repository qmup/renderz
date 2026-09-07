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

  it("keeps other facet options after selecting one program or league", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24029971",
        name: "Messi",
        rating: 114,
        programId: "NUMERO26",
        nationName: "Argentina",
        clubName: "Inter Miami CF",
        leagueName: "MLS",
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24044714",
        name: "Mbappe",
        rating: 120,
        programId: "GC26",
        nationName: "France",
        clubName: "Real Madrid",
        leagueName: "LALIGA",
      }),
      [],
    );

    const byProgram = await catalog.list(
      normalizePlayerListQuery({ filters: { programIds: ["NUMERO26"] } }),
    );
    expect(byProgram.total).toBe(1);
    expect(byProgram.items[0]?.name).toBe("Messi");
    expect(byProgram.facets.programs.map((option) => option.value)).toEqual([
      "GC26",
      "NUMERO26",
    ]);

    const byLeague = await catalog.list(
      normalizePlayerListQuery({ filters: { leagues: ["MLS"] } }),
    );
    expect(byLeague.facets.leagues.map((option) => option.value)).toEqual([
      "LALIGA",
      "MLS",
    ]);
    expect(byLeague.facets.nations.map((option) => option.value)).toEqual([
      "Argentina",
    ]);
  });

  it("matches accented names using ascii search", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24049024",
        name: "Kylian Mbappé",
        slug: "mbappé",
        rating: 120,
      }),
      [],
    );
    const result = await catalog.list(normalizePlayerListQuery({ q: "mbappe" }));
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe("Kylian Mbappé");
  });

  it("exposes alternate positions and PAC–PHY stats on list items", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "24049025",
        name: "Iniesta",
        rating: 118,
        position: "CAM",
        altPositions: ["CM", "LW"],
        stats: [
          { key: "avg1", value: 140 },
          { key: "avg2", value: 128 },
          { key: "avg3", value: 151 },
          { key: "avg4", value: 149 },
          { key: "avg5", value: 88 },
          { key: "avg6", value: 121 },
          { key: "acc", value: 142 },
        ],
      }),
      [],
    );
    const result = await catalog.list(normalizePlayerListQuery({}));
    expect(result.items[0]?.altPositions).toEqual(["CM", "LW"]);

    const primaryOnly = await catalog.list(
      normalizePlayerListQuery({ filters: { positions: ["LW"] } }),
    );
    expect(primaryOnly.total).toBe(0);

    const withAlt = await catalog.list(
      normalizePlayerListQuery({
        filters: { positions: ["LW"], includeAltPositions: true },
      }),
    );
    expect(withAlt.items.map((row) => row.name)).toEqual(["Iniesta"]);

    const stillPrimary = await catalog.list(
      normalizePlayerListQuery({
        filters: { positions: ["CAM"], includeAltPositions: true },
      }),
    );
    expect(stillPrimary.items.map((row) => row.name)).toEqual(["Iniesta"]);
    expect(result.items[0]?.avgStats.map((stat) => [stat.label, stat.value])).toEqual(
      [
        ["PAC", 140],
        ["SHO", 128],
        ["PAS", 151],
        ["DRI", 149],
        ["DEF", 88],
        ["PHY", 121],
      ],
    );
  });

  it("exposes card, common, and last names on list items", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "30920628",
        slug: "cesc-fabregas",
        name: "Francesc Fàbregas i Soler",
        cardName: "Cesc Fàbregas",
        firstName: "Francesc",
        lastName: "Fàbregas i Soler",
        commonName: "Cesc Fàbregas",
        rating: 121,
        playStyles: [
          { id: "12683081", name: "Aerial Defense", level: 1 },
          { id: "987634376", level: 2 },
        ],
      }),
      [],
    );
    const result = await catalog.list(normalizePlayerListQuery({}));
    expect(result.items[0]?.cardName).toBe("Cesc Fàbregas");
    expect(result.items[0]?.commonName).toBe("Cesc Fàbregas");
    expect(result.items[0]?.lastName).toBe("Fàbregas i Soler");
    expect(result.items[0]?.name).toBe("Francesc Fàbregas i Soler");
    expect(result.items[0]?.playStyles).toEqual([
      { id: "12683081", level: 1 },
      { id: "987634376", level: 2 },
    ]);

    const byCommon = await catalog.list(normalizePlayerListQuery({ q: "cesc" }));
    expect(byCommon.total).toBe(1);
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
    await catalog.upsertPlayer(
      {
        ...player,
        starSigningsBuy: 62240,
        starSigningsSell: 10000,
        availableImageKinds: ["card"],
      },
      [
        {
          playerId: parsePlayerId("24029971"),
          kind: "card",
          upstreamUrl: "https://images-v2.renderz.app/card",
          fetchedAt: 1,
        },
        {
          playerId: parsePlayerId("24029971"),
          kind: "playstyle-12683081",
          upstreamUrl: "https://images-v2.renderz.app/playstyle",
          fetchedAt: 1,
        },
      ],
    );
    const priced = await catalog.getById("24029971");
    expect(priced?.starSigningsBuy).toBe(62240);
    expect(JSON.stringify(priced)).not.toContain("images-v2.renderz.app");
    const icon = await catalog.getAsset("24029971", "playstyle-12683081");
    expect(icon?.upstreamUrl).toContain("playstyle");
  });

  it("shares playstyle icons across players that have the same kind", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "30920624",
        name: "Varane",
        rating: 122,
        slug: "varane",
        playStyles: [{ id: "987634376", level: 1 }],
      }),
      [
        {
          playerId: parsePlayerId("30920624"),
          kind: "playstyle-987634376",
          upstreamUrl: "https://images-v2.renderz.app/playstyle-anticipate",
          fetchedAt: 20,
        },
      ],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "30920625",
        name: "Koeman",
        rating: 121,
        slug: "koeman",
        playStyles: [{ id: "987634376", level: 1 }],
      }),
      [],
    );

    expect(await catalog.getAsset("30920625", "playstyle-987634376")).toBeNull();
    const shared = await catalog.findSharedIconAsset("playstyle-987634376");
    expect(shared?.playerId).toBe("30920624");
    expect(shared?.upstreamUrl).toContain("playstyle-anticipate");
    expect(await catalog.findSharedIconAsset("card")).toBeNull();
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

  it("claims ingest jobs by kind", async () => {
    const { catalog } = createTestCatalog();
    await catalog.enqueueRefresh("1", "keep", 1_000);
    await catalog.enqueueDiscovery("2", "new", 1_000);
    const discoveries = await catalog.claimNext(10, 1_000, 60_000, "discovery");
    expect(discoveries.map((job) => job.playerId)).toEqual(["2"]);
    expect(await catalog.countOpenIngestJobs("discovery")).toBe(1);
    expect(await catalog.countOpenIngestJobs("refresh")).toBe(1);
    const refreshes = await catalog.claimNext(10, 1_000, 60_000, "refresh");
    expect(refreshes.map((job) => job.playerId)).toEqual(["1"]);
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

  it("deletes players and records skipped ids", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({ id: "9", name: "Gone", rating: 80, slug: "gone" }),
      [],
    );
    await catalog.deletePlayer("9");
    expect(await catalog.getById("9")).toBeNull();
    await catalog.recordSkipped("9", "gone", "too old", 1_000);
    expect(await catalog.isSkipped("9")).toBe(true);
  });

  it("counts pending and in-progress ingest jobs", async () => {
    const { catalog } = createTestCatalog();
    await catalog.enqueueDiscovery("1", "one", 1_000);
    await catalog.enqueueDiscovery("2", "two", 1_000);
    expect(await catalog.countOpenIngestJobs()).toBe(2);
    await catalog.claimNext(1, 1_000);
    expect(await catalog.countOpenIngestJobs()).toBe(2);
    const [claimed] = await catalog.claimNext(1, 1_000);
    await catalog.markSucceeded(claimed.id, 1_000);
    expect(await catalog.countOpenIngestJobs()).toBe(1);
  });

  it("skips open discovery jobs at or before a createdAt cutoff", async () => {
    const { catalog } = createTestCatalog();
    await catalog.enqueueDiscovery("1", "keep", 1_000);
    await catalog.enqueueDiscovery("2", "old-a", 1_000);
    await catalog.enqueueDiscovery("3", "later", 2_000);
    const drained = await catalog.skipOpenDiscoveryJobs("too old", 1_000, 3_000);
    expect(drained).toBe(2);
    expect(await catalog.isSkipped("1")).toBe(true);
    expect(await catalog.isSkipped("2")).toBe(true);
    expect(await catalog.isSkipped("3")).toBe(false);
    const remaining = await catalog.claimNext(10, 3_000);
    expect(remaining.map((job) => job.playerId)).toEqual(["3"]);
  });

  it("skips discovery jobs for an explicit player id list", async () => {
    const { catalog } = createTestCatalog();
    await catalog.enqueueDiscovery("1", "keep", 1_000);
    await catalog.enqueueDiscovery("2", "cut", 1_000);
    const updated = await catalog.skipDiscoveryJobsByPlayerIds(
      [{ id: "2", slug: "cut" }],
      "too old",
      2_000,
    );
    expect(updated).toBe(1);
    expect(await catalog.isSkipped("2")).toBe(true);
    expect(await catalog.isSkipped("1")).toBe(false);
    const remaining = await catalog.claimNext(10, 2_000);
    expect(remaining.map((job) => job.playerId)).toEqual(["1"]);
  });

  it("defaults to newest added first", async () => {
    const { catalog } = createTestCatalog();
    const day1Morning = Date.parse("2026-09-01T08:00:00.000Z");
    const day1Evening = Date.parse("2026-09-01T20:00:00.000Z");
    const day2 = Date.parse("2026-09-02T01:00:00.000Z");
    await catalog.upsertPlayer(
      fakePlayer({
        id: "1",
        name: "OlderHigh",
        rating: 120,
        addedAt: day1Morning,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "2",
        name: "SameDayLow",
        rating: 90,
        addedAt: day1Evening,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "3",
        name: "SameDayB",
        rating: 110,
        addedAt: day1Morning,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "4",
        name: "SameDayA",
        rating: 110,
        addedAt: day1Evening,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "5",
        name: "NewerLow",
        rating: 80,
        addedAt: day2,
      }),
      [],
    );
    const listed = await catalog.list(normalizePlayerListQuery({}));
    expect(listed.items.map((row) => row.name)).toEqual([
      "NewerLow",
      "OlderHigh",
      "SameDayA",
      "SameDayB",
      "SameDayLow",
    ]);
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
