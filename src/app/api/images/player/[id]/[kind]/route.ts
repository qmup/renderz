import { getPlayerCatalog } from '@/lib/catalog/runtime';
import {
  readCachedImage,
  readLoopPublicFile,
  sharedLoopCacheId,
  writeCachedImage,
} from '@/lib/catalog/image-cache';
import { enrichDiscoveredPlayer } from '@/lib/catalog/enrichment';
import {
  isPlayerCommonImageKind,
  isPlayerIconImageKind,
  isPlayerLoopImageKind,
  playStyleBaseImageKind,
  playStyleLevelFromImageKind,
  playStyleLevelFromUpstreamUrl,
  playerImageKindSchema,
  playerIdSchema,
  type PlayerAssetRow,
  type PlayerCommonImageKind,
  type PlayerImageKind,
} from '@/lib/domain/player';
import {
  ImageProxyRejectedError,
  isAppError,
  NotFoundError,
} from '@/lib/http/errors';
import { PLACEHOLDER_SVG } from '@/lib/providers/renderz/image-policy';
import { isExpiredImageError } from '@/lib/providers/renderz/image-errors';
import { fetchAllowlistedImage } from '@/lib/providers/renderz/image-proxy';
import { getRenderzSource } from '@/lib/providers/renderz/renderz-source';
import { ZodError } from 'zod';
import type { PlayerCatalog } from '@/lib/catalog/repository';

export const runtime = 'nodejs';

/** Server-only well-known common assets (never ship these URLs to the browser). */
const COMMON_IMAGE_UPSTREAM_URLS: Record<PlayerCommonImageKind, string> = {
  untradeable:
    'https://images-v2-unsigned.renderz.app/common_23_untradeable_icon',
  /** Star Signings BUY/SELL currency (RenderZ `common_STAR_SHARD_S`). */
  'star-shard': 'https://images-v2-unsigned.renderz.app/common_STAR_SHARD_S',
};

function commonImageUpstreamUrl(kind: PlayerImageKind): string | undefined {
  if (!isPlayerCommonImageKind(kind)) {
    return undefined;
  }
  return COMMON_IMAGE_UPSTREAM_URLS[kind];
}

function placeholder(): Response {
  return new Response(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function imageResponse(
  bytes: Uint8Array,
  contentType: string,
  immutable: boolean,
): Response {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': immutable
        ? 'public, max-age=86400, stale-while-revalidate=604800'
        : 'private, max-age=3600',
    },
  });
}

async function resolveAsset(
  catalog: PlayerCatalog,
  playerId: string,
  kind: PlayerImageKind,
): Promise<PlayerAssetRow | null> {
  const commonUrl = commonImageUpstreamUrl(kind);
  if (commonUrl) {
    return {
      playerId: playerIdSchema.parse(playerId),
      kind,
      upstreamUrl: commonUrl,
      fetchedAt: 0,
    };
  }

  const own = await catalog.getAsset(playerId, kind);
  if (own) {
    return own;
  }

  const level = playStyleLevelFromImageKind(kind);
  const baseKind = playStyleBaseImageKind(kind);
  if (level !== undefined && baseKind) {
    const legacy = await catalog.getAsset(playerId, baseKind);
    if (legacy && playStyleLevelFromUpstreamUrl(legacy.upstreamUrl) === level) {
      return legacy;
    }
  }

  if (!isPlayerIconImageKind(kind)) {
    return null;
  }

  const shared = await catalog.findSharedIconAsset(kind);
  if (shared) {
    return shared;
  }

  if (level !== undefined && baseKind) {
    const sharedLegacy = await catalog.findSharedIconAsset(baseKind);
    if (
      sharedLegacy &&
      playStyleLevelFromUpstreamUrl(sharedLegacy.upstreamUrl) === level
    ) {
      return sharedLegacy;
    }
  }

  return null;
}

async function fetchAndCache(
  playerId: string,
  kind: PlayerImageKind,
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const image = await fetchAllowlistedImage(url);
  writeCachedImage(playerId, kind, image.bytes);
  return image;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const params = await context.params;
    const id = playerIdSchema.parse(params.id);
    const kind = playerImageKindSchema.parse(params.kind);
    const cached = readCachedImage(id, kind);
    if (cached) {
      return imageResponse(cached.bytes, cached.contentType, true);
    }

    const catalog = getPlayerCatalog();
    if (!(await catalog.exists(id))) {
      throw new NotFoundError();
    }

    let asset = await resolveAsset(catalog, id, kind);
    if (!asset) {
      return placeholder();
    }

    if (isPlayerLoopImageKind(kind)) {
      const sharedId = sharedLoopCacheId(asset.upstreamUrl);
      if (sharedId) {
        const sharedCached = readCachedImage(sharedId, kind);
        if (sharedCached) {
          return imageResponse(
            sharedCached.bytes,
            sharedCached.contentType,
            true,
          );
        }
      }
      const fromPublic = readLoopPublicFile(asset.upstreamUrl);
      if (fromPublic) {
        if (sharedId) {
          writeCachedImage(sharedId, kind, fromPublic.bytes);
        }
        return imageResponse(fromPublic.bytes, fromPublic.contentType, true);
      }
    }

    try {
      const cacheId = isPlayerLoopImageKind(kind)
        ? (sharedLoopCacheId(asset.upstreamUrl) ?? id)
        : id;
      const image = await fetchAndCache(cacheId, kind, asset.upstreamUrl);
      return imageResponse(image.bytes, image.contentType, false);
    } catch (error) {
      // Signed CDN URLs expire; refresh the player row and retry. Needed in
      // production when a new LOOP sheet is not yet in public/loops.
      if (isExpiredImageError(error)) {
        try {
          await enrichDiscoveredPlayer(catalog, getRenderzSource(), id);
          asset = await resolveAsset(catalog, id, kind);
          if (asset) {
            if (isPlayerLoopImageKind(kind)) {
              const fromPublic = readLoopPublicFile(asset.upstreamUrl);
              if (fromPublic) {
                return imageResponse(
                  fromPublic.bytes,
                  fromPublic.contentType,
                  true,
                );
              }
            }
            const cacheId = isPlayerLoopImageKind(kind)
              ? (sharedLoopCacheId(asset.upstreamUrl) ?? id)
              : id;
            const image = await fetchAndCache(cacheId, kind, asset.upstreamUrl);
            return imageResponse(image.bytes, image.contentType, false);
          }
        } catch {
          return placeholder();
        }
      }
      return placeholder();
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid image request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (isAppError(error) && error instanceof NotFoundError) {
      return placeholder();
    }
    if (error instanceof ImageProxyRejectedError) {
      return placeholder();
    }
    return placeholder();
  }
}
