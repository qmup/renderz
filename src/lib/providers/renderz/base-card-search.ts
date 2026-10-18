import { deflateRawSync } from 'node:zlib';
import { ParseError } from '@/lib/http/errors';
import { RenderzClient } from '@/lib/providers/renderz/client';

const PAGE_SIZE = 100;
const MAX_FROM = 20_000;

/**
 * bindingXml templates behind the "FC Base Gold Player" and
 * "FC Base Silver Player" subtitles. Bronze is intentionally absent.
 * RenderZ spells the current silver frame "Sliver".
 */
export const BASE_CARD_BINDING_QUERY =
  '*Gold_Base* OR *Silver_Base* OR *Sliver_Base* OR *BASE_GOLD* OR *BASE_SILVER* OR *BASE_SLIVER*';

export type BaseCardSearchEntry = {
  id: string;
  slug: string;
};

export function baseCardSearchBody(from: number, size = PAGE_SIZE) {
  return {
    query: {
      bool: {
        must: [
          {
            query_string: {
              fields: ['bindingXml'],
              query: BASE_CARD_BINDING_QUERY,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
    sort: [{ assetId: { order: 'asc' } }],
    from,
    size,
    _source: [],
  };
}

/** Deflate + base64url, matching the RenderZ search client. */
export function encodeRenderzSearchQuery(query: unknown): string {
  const raw = Buffer.from(JSON.stringify(query));
  return deflateRawSync(raw, { level: 9 }).toString('base64url');
}

export function entriesFromSearchPayload(payload: unknown): BaseCardSearchEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.players)) {
    throw new ParseError('RenderZ search response has no players');
  }
  const entries: BaseCardSearchEntry[] = [];
  for (const player of payload.players) {
    if (!isRecord(player)) {
      continue;
    }
    const id = String(player.assetId ?? '');
    if (!/^\d+$/.test(id)) {
      continue;
    }
    const cardName =
      typeof player.cardName === 'string' ? player.cardName : undefined;
    entries.push({ id, slug: slugFromCardName(cardName, id) });
  }
  return entries;
}

export function sourceSearchBody(source: string, from: number, size = PAGE_SIZE) {
  return {
    query: {
      bool: {
        must: [
          {
            query_string: {
              fields: ['source'],
              query: source,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
    sort: [{ assetId: { order: 'asc' } }],
    from,
    size,
    _source: [],
  };
}

export async function listSourceCardEntries(
  source: string,
  client = new RenderzClient(),
): Promise<BaseCardSearchEntry[]> {
  const entries: BaseCardSearchEntry[] = [];
  const seen = new Set<string>();
  for (let from = 0; from < MAX_FROM; from += PAGE_SIZE) {
    const payload = await client.getSearchJson(
      encodeRenderzSearchQuery(sourceSearchBody(source, from)),
    );
    const page = entriesFromSearchPayload(payload);
    for (const entry of page) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      entries.push(entry);
    }
    if (page.length < PAGE_SIZE) {
      break;
    }
  }
  return entries;
}

export async function listBaseCardEntries(
  client = new RenderzClient(),
): Promise<BaseCardSearchEntry[]> {
  const entries: BaseCardSearchEntry[] = [];
  const seen = new Set<string>();
  for (let from = 0; from < MAX_FROM; from += PAGE_SIZE) {
    const payload = await client.getSearchJson(
      encodeRenderzSearchQuery(baseCardSearchBody(from)),
    );
    const page = entriesFromSearchPayload(payload);
    for (const entry of page) {
      if (seen.has(entry.id)) {
        continue;
      }
      seen.add(entry.id);
      entries.push(entry);
    }
    if (page.length < PAGE_SIZE) {
      break;
    }
  }
  return entries;
}

function slugFromCardName(cardName: string | undefined, id: string): string {
  const slug = cardName
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
