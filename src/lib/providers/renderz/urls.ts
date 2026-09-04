export const RENDERZ_ORIGIN = "https://renderz.app";

export const RENDERZ_PAGE_HEADERS = {
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8",
  Referer: "https://renderz.app/",
  // Browser-like UA: Cloudflare often 403s custom/bot UAs from datacenter IPs (e.g. Actions).
  "User-Agent":
    process.env.RENDERZ_USER_AGENT?.trim() ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export function playersUrl(): string {
  return `${RENDERZ_ORIGIN}/players`;
}

export function playersDataUrl(): string {
  return `${RENDERZ_ORIGIN}/players/__data.json`;
}

export function playerPath(id: string, slug?: string): string {
  return slug ? `/player/${id}-${slug}` : `/player/${id}`;
}

export function playerUrl(id: string, slug?: string): string {
  return `${RENDERZ_ORIGIN}${playerPath(id, slug)}`;
}

export function playerDataUrl(id: string, slug?: string): string {
  return `${playerUrl(id, slug)}/__data.json`;
}

export function sitemapIndexUrl(): string {
  return `${RENDERZ_ORIGIN}/sitemap.xml`;
}

export function sitemapPlayersUrl(index: 1 | 2): string {
  return `${RENDERZ_ORIGIN}/sitemap-players-${index}.xml`;
}

export function parsePlayerHref(
  href: string,
): { id: string; slug: string } | null {
  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href;
    const match = path.match(/\/player\/(\d+)(?:-([^/?#]+))?/);
    if (!match?.[1]) {
      return null;
    }
    return { id: match[1], slug: match[2] ?? "" };
  } catch {
    return null;
  }
}
