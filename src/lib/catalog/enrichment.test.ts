import { describe, expect, it } from "vitest";
import { enrichDiscoveredPlayer } from "@/lib/catalog/enrichment";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import { fakePlayer, FakePlayerDataSource, fakeSeed } from "@/lib/providers/fake-source";
import { UndiscoveredPlayerError } from "@/lib/http/errors";

describe("enrichDiscoveredPlayer", () => {
  it("does not fetch unknown ids from the data source", async () => {
    const { catalog } = createTestCatalog();
    const source = FakePlayerDataSource.fromPlayers([
      fakePlayer({ id: "24029971", name: "Messi", rating: 114 }),
    ]);

    await expect(
      enrichDiscoveredPlayer(catalog, source, "24029971"),
    ).rejects.toBeInstanceOf(UndiscoveredPlayerError);
    expect(source.getPlayerCalls).toEqual([]);
  });

  it("enriches an id already in the catalog", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertDiscovered(fakeSeed("24029971", "Messi", 114, "messi"));
    const detailed = fakePlayer({
      id: "24029971",
      name: "Lionel Messi",
      rating: 114,
      slug: "messi",
      position: "ST",
    });
    const source = FakePlayerDataSource.fromPlayers([detailed]);

    const result = await enrichDiscoveredPlayer(catalog, source, "24029971");
    expect(source.getPlayerCalls).toEqual(["24029971"]);
    expect(result.position).toBe("ST");
    expect((await catalog.getById("24029971"))?.name).toBe("Lionel Messi");
  });
});
