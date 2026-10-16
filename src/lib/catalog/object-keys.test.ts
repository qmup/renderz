import { describe, expect, it } from "vitest";
import {
  catalogObjectKey,
  planCatalogUploads,
} from "@/lib/catalog/object-keys";

describe("catalogObjectKey", () => {
  it("stores card art under the player id and shared icons once", () => {
    expect(
      catalogObjectKey("30921214", "card", "https://images-v2.renderz.app/card"),
    ).toBe("player-art/30921214/card.png");
    expect(
      catalogObjectKey(
        "30921214",
        "playstyle-269342936-l2",
        "https://images-v2.renderz.app/playstyle",
      ),
    ).toBe("player-art/_shared/playstyle-269342936-l2.png");
    expect(
      catalogObjectKey(
        "30921214",
        "trait-16",
        "https://images-v2.renderz.app/trait",
      ),
    ).toBe("player-art/_shared/trait-16.png");
    expect(
      catalogObjectKey(
        "30921214",
        "loop-f45",
        "https://images-v2.renderz.app/sprite_23_anniversary27_ANNIVERSARY27_BASE_LOOP",
      ),
    ).toBe("loops/sprite_23_anniversary27_ANNIVERSARY27_BASE_LOOP.png");
  });
});

describe("planCatalogUploads", () => {
  it("keeps the newest URL and marks an icon required when this run needs it", () => {
    const jobs = planCatalogUploads([
      {
        playerId: "1",
        kind: "playstyle-1-l1",
        upstreamUrl: "https://images-v2.renderz.app/old",
        fetchedAt: 1,
        required: false,
      },
      {
        playerId: "2",
        kind: "playstyle-1-l1",
        upstreamUrl: "https://images-v2.renderz.app/new",
        fetchedAt: 2,
        required: true,
      },
      {
        playerId: "2",
        kind: "trait-9",
        upstreamUrl: "https://images-v2.renderz.app/trait-old",
        fetchedAt: 1,
        required: true,
      },
      {
        playerId: "3",
        kind: "trait-9",
        upstreamUrl: "https://images-v2.renderz.app/trait-new",
        fetchedAt: 5,
        required: false,
      },
    ]);
    expect(jobs).toEqual([
      {
        key: "player-art/_shared/playstyle-1-l1.png",
        upstreamUrl: "https://images-v2.renderz.app/new",
        required: true,
      },
      {
        key: "player-art/_shared/trait-9.png",
        upstreamUrl: "https://images-v2.renderz.app/trait-new",
        required: true,
      },
    ]);
  });
});
