/** Stop walking a newest-first sitemap after this many settled ids in a row. */
export const SITEMAP_KNOWN_STREAK = 100;

/**
 * Cards newer than the catalog sit at the front of a newest-first sitemap.
 * Return that prefix, and stop once `streak` settled ids have been seen in a row.
 */
export function takeSitemapHead<T extends { id: string }>(
  entries: readonly T[],
  isSettled: (id: string) => boolean,
  streak = SITEMAP_KNOWN_STREAK,
): T[] {
  const fresh: T[] = [];
  let run = 0;
  for (const entry of entries) {
    if (isSettled(entry.id)) {
      run += 1;
      if (run >= streak) {
        break;
      }
      continue;
    }
    run = 0;
    fresh.push(entry);
  }
  return fresh;
}

export async function takeSitemapHeadAsync<T extends { id: string }>(
  entries: readonly T[],
  isSettled: (id: string) => Promise<boolean>,
  streak = SITEMAP_KNOWN_STREAK,
): Promise<T[]> {
  const fresh: T[] = [];
  let run = 0;
  for (const entry of entries) {
    if (await isSettled(entry.id)) {
      run += 1;
      if (run >= streak) {
        break;
      }
      continue;
    }
    run = 0;
    fresh.push(entry);
  }
  return fresh;
}
