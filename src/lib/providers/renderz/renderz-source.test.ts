import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RenderzClient } from "@/lib/providers/renderz/client";
import { RenderzHtmlSource } from "@/lib/providers/renderz/renderz-source";

const fixtures = path.join(process.cwd(), "test/fixtures/renderz/minimized");

function read(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

describe("RenderzHtmlSource", () => {
  it("skips sitemap children that are not on renderz.app", async () => {
    const fetched: string[] = [];
    const client = {
      getText: async (url: string) => {
        fetched.push(url);
        if (url === "https://renderz.app/sitemap.xml") {
          return read("sitemap-index.xml");
        }
        if (url === "https://renderz.app/sitemap-players-1.xml") {
          return read("sitemap-players.xml");
        }
        throw new Error(`unexpected fetch ${url}`);
      },
    } as unknown as RenderzClient;

    const source = new RenderzHtmlSource(client);
    const entries = await source.listSitemapEntries();
    expect(fetched).toEqual([
      "https://renderz.app/sitemap.xml",
      "https://renderz.app/sitemap-players-1.xml",
    ]);
    expect(entries.map((entry) => entry.id)).toEqual(["24029971", "24044714"]);
  });
});
