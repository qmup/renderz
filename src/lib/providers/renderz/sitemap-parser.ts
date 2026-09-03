import { parsePlayerHref } from "@/lib/providers/renderz/urls";
import { parsePlayerId, type PlayerId } from "@/lib/domain/player";

export type SitemapPlayerEntry = {
  id: PlayerId;
  slug: string;
};

export function parseSitemapPlayerLocs(xml: string): SitemapPlayerEntry[] {
  const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) =>
    match[1].trim(),
  );
  const entries: SitemapPlayerEntry[] = [];
  const seen = new Set<string>();
  for (const loc of locs) {
    const parsed = parsePlayerHref(loc);
    if (!parsed) {
      continue;
    }
    if (seen.has(parsed.id)) {
      continue;
    }
    seen.add(parsed.id);
    entries.push({ id: parsePlayerId(parsed.id), slug: parsed.slug });
  }
  return entries;
}

export function parseSitemapChildLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter((loc) => /sitemap-players-\d+\.xml$/i.test(loc));
}
