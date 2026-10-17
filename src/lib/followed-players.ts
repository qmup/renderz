import { PLAYER_ID_PATTERN } from "@/lib/domain/player";

export const FOLLOWED_PLAYER_IDS_KEY = "fcvn.followed-player-ids";
export const MAX_FOLLOWED_PLAYERS = 100;

/** Keep numeric ids, drop duplicates, preserve order. */
export function parseFollowedPlayerIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of parsed) {
    if (typeof value !== "string" || !PLAYER_ID_PATTERN.test(value)) {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    ids.push(value);
    if (ids.length >= MAX_FOLLOWED_PLAYERS) {
      break;
    }
  }
  return ids;
}

/**
 * Add `id` at the front, or remove it if it is already followed.
 * Result never contains duplicates.
 */
export function toggleFollowedPlayerId(
  ids: readonly string[],
  id: string,
): string[] {
  if (!PLAYER_ID_PATTERN.test(id)) {
    return parseFollowedPlayerIds(JSON.stringify(ids));
  }
  const current = parseFollowedPlayerIds(JSON.stringify(ids));
  if (current.includes(id)) {
    return current.filter((item) => item !== id);
  }
  return [id, ...current].slice(0, MAX_FOLLOWED_PLAYERS);
}
