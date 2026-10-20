import { CURRENT_PARSE_VERSION } from '@/lib/catalog/parse-version';

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const DUMP_PATTERN =
  /like|dislike|download card|watchlist|see all related|latest comments/i;
const UNRESOLVED_KEY =
  /^(TeamName_|NationName_|LeagueName_|programname_|traits_title_|NAME_SKILL_|PlayerInfo_|biotxt_|PLAYSTYLE_)/i;

export function displayLabel(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length < 1 || compact.length > 80) {
    return undefined;
  }
  if (DUMP_PATTERN.test(compact)) {
    return undefined;
  }

  const common = compact.match(/^Common_(.+)$/i);
  if (common?.[1]) {
    return humanizeToken(common[1]);
  }

  const workRate = compact.match(/WorkRate_(.+)$/i);
  if (workRate?.[1]) {
    return humanizeToken(workRate[1]);
  }

  if (UNRESOLVED_KEY.test(compact)) {
    return undefined;
  }

  return compact;
}

export function displayProgramName(
  programName?: string,
  programId?: string,
): string | undefined {
  return displayLabel(programName) ?? displayLabel(programId);
}

export function isStaleCatalogRow(
  row: { fetchedAt: number; parseVersion: number },
  now = Date.now(),
  currentParseVersion = CURRENT_PARSE_VERSION,
  staleAfterMs = STALE_AFTER_MS,
): boolean {
  return (
    row.parseVersion < currentParseVersion || now - row.fetchedAt > staleAfterMs
  );
}

export function catalogRowNeedsEnrich(player: {
  parseVersion: number;
  playStyles: Array<{ name?: string; description?: string }>;
  traits?: Array<{ name?: string }>;
}): boolean {
  if (player.parseVersion < CURRENT_PARSE_VERSION) {
    return true;
  }
  if (
    player.playStyles.some(
      (style) =>
        !style.name ||
        /^PLAYSTYLE_/i.test(style.name) ||
        !style.description?.trim(),
    )
  ) {
    return true;
  }
  return (player.traits ?? []).some(
    (trait) => !trait.name || /^traits_title_/i.test(trait.name),
  );
}

export function formatFetchedAt(ms: number): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms);
}

/** Compact UTC calendar date shown on listing rows. Sort uses the full addedAt instant. */
export function formatAddedDate(ms: number, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(ms);
}

const INDOCHINA_TIME = 'Asia/Ho_Chi_Minh';

/** Calendar date of a listing refresh, in UTC+7. */
export function formatRefreshDate(at: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: INDOCHINA_TIME,
  }).format(at);
}

/** Clock for a listing refresh instant, in UTC+7. */
export function formatRefreshClock(at: Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: INDOCHINA_TIME,
  }).format(at);
}

export function formatFetchedRelative(ms: number, locale = 'en'): string {
  const delta = Math.max(0, Date.now() - ms);
  const minutes = Math.floor(delta / 60_000);
  const vi = locale === 'vi';
  if (minutes < 1) {
    return vi ? 'vừa xong' : 'just now';
  }
  if (minutes < 60) {
    return vi ? `${minutes} phút trước` : `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return vi ? `${hours} giờ trước` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return vi ? `${days} ngày trước` : `${days}d ago`;
}

export function displayPlayStyleLabel(style: {
  name?: string;
  key?: string;
}): string | undefined {
  return (
    displayLabel(style.name) ?? humanizePrefixedKey(style.key, 'PLAYSTYLE_')
  );
}

export function displayTraitLabel(trait: {
  name?: string;
  key?: string;
}): string | undefined {
  return (
    displayLabel(trait.name) ?? humanizePrefixedKey(trait.key, 'traits_title_')
  );
}

export function formatCoinAmount(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);
}

export function formatRetryAfter(retryAfterMs?: number, locale = 'en'): string {
  const vi = locale === 'vi';
  if (!retryAfterMs || retryAfterMs <= 0) {
    return vi ? 'một lát' : 'a moment';
  }
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) {
    return vi ? `${seconds} giây` : `${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return vi ? `${minutes} phút` : `${minutes}m`;
}

function humanizePrefixedKey(
  value: string | undefined,
  prefix: string,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(new RegExp(`^${prefix}(.+)$`, 'i'));
  if (!match?.[1] || /^\d+$/.test(match[1])) {
    return undefined;
  }
  return humanizeToken(match[1]);
}

function humanizeToken(token: string): string {
  return token
    .replaceAll('_', ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
