import { PLAYER_ID_PATTERN } from "@/lib/domain/player";

export const FOLLOWED_PLAYER_IDS_KEY = "fcvn.followed-player-ids";
export const FOLLOW_SYNC_CODE_KEY = "fcvn.follow-sync-code";
export const MAX_FOLLOWED_PLAYERS = 100;

/** Crockford base32 without I, L, O, U so codes are easy to type. */
const SYNC_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SYNC_CODE_LENGTH = 10;
const SYNC_CODE_PATTERN = new RegExp(
  `^[${SYNC_CODE_ALPHABET}]{${SYNC_CODE_LENGTH}}$`,
);

export function generateSyncCode(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): string {
  const bytes = random(new Uint8Array(SYNC_CODE_LENGTH));
  let code = "";
  for (const byte of bytes) {
    code += SYNC_CODE_ALPHABET[byte % SYNC_CODE_ALPHABET.length];
  }
  return code;
}

/** Uppercase, drop spaces/dashes, and return null unless it is a valid code. */
export function normalizeSyncCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return SYNC_CODE_PATTERN.test(code) ? code : null;
}

/** Server ids first, then local-only ids, capped and deduplicated. */
export function mergeFollowedPlayerIds(
  server: readonly string[],
  local: readonly string[],
): string[] {
  return parseFollowedPlayerIds(JSON.stringify([...server, ...local]));
}

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
