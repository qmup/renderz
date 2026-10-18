import { describe, expect, it } from "vitest";
import { takeSitemapHead } from "@/lib/ingest/sitemap-head";

describe("takeSitemapHead", () => {
  it("keeps the unknown prefix and stops after a settled streak", () => {
    const entries = [
      { id: "new" },
      { id: "known-a" },
      { id: "hole" },
      { id: "known-b" },
      { id: "known-c" },
      { id: "later" },
    ];
    const settled = new Set(["known-a", "known-b", "known-c"]);
    expect(
      takeSitemapHead(entries, (id) => settled.has(id), 2).map((entry) => entry.id),
    ).toEqual(["new", "hole"]);
  });
});
