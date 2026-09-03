import { describe, expect, it } from "vitest";
import { findInflatedField, inflateSvelteKitData } from "@/lib/providers/renderz/sveltekit-data";

describe("inflateSvelteKitData", () => {
  it("treats numbers inside objects as pointers and slot primitives as values", () => {
    const nodes = inflateSvelteKitData({
      type: "data",
      nodes: [
        {
          type: "data",
          data: [
            { player: 1 },
            { id: 2, rating: 3, name: 4 },
            24044714,
            120,
            "Mbappe",
          ],
        },
      ],
    });
    const player = findInflatedField<Record<string, unknown>>(nodes, "player");
    expect(player).toEqual({
      id: 24044714,
      rating: 120,
      name: "Mbappe",
    });
  });
});
