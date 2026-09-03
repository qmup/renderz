import { describe, expect, it } from "vitest";
import { pruneOldPlayers } from "@/lib/catalog/prune";
import { createTestCatalog } from "@/lib/catalog/test-helpers";
import { fakePlayer } from "@/lib/providers/fake-source";

const NOW = Date.parse("2026-09-03T00:00:00.000Z");
const RECENT = Date.parse("2026-08-01T00:00:00.000Z");
const OLD = Date.parse("2026-01-01T00:00:00.000Z");

describe("pruneOldPlayers", () => {
  it("removes cards older than three months and rows without addedAt", async () => {
    const { catalog } = createTestCatalog();
    await catalog.upsertPlayer(
      fakePlayer({
        id: "1",
        name: "Keep",
        rating: 100,
        slug: "keep",
        addedAt: RECENT,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "2",
        name: "Old",
        rating: 101,
        slug: "old",
        addedAt: OLD,
      }),
      [],
    );
    await catalog.upsertPlayer(
      fakePlayer({
        id: "3",
        name: "Unknown",
        rating: 102,
        slug: "unknown",
      }),
      [],
    );

    const result = await pruneOldPlayers(catalog, { now: NOW });
    expect(result.kept).toBe(1);
    expect(result.pruned).toBe(2);
    expect(result.remaining).toBe(1);
    expect(result.invalid).toBe(0);
    expect((await catalog.getById("1"))?.name).toBe("Keep");
    expect(await catalog.getById("2")).toBeNull();
    expect(await catalog.getById("3")).toBeNull();
    expect(await catalog.isSkipped("2")).toBe(true);
    expect(await catalog.isSkipped("3")).toBe(true);
  });
});
