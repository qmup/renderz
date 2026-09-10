import { enrichDiscoveredPlayer } from '@/lib/catalog/enrichment';
import {
  readCachedImage,
  readLoopPublicFile,
  sharedLoopCacheId,
  writeCachedImage,
} from '@/lib/catalog/image-cache';
import type { PlayerCatalog } from '@/lib/catalog/repository';
import {
  isPlayerLoopImageKind,
  type PlayerAssetRow,
  type PlayerImageKind,
} from '@/lib/domain/player';
import { isExpiredImageError } from '@/lib/providers/renderz/image-errors';
import { fetchAllowlistedImage } from '@/lib/providers/renderz/image-proxy';
import { getRenderzSource } from '@/lib/providers/renderz/renderz-source';

/**
 * Best-effort: ensure a LOOP sheet is available from public/loops or the
 * /tmp image cache so detail animation can start without waiting on the
 * client. Used when a player was enriched on-demand with a brand-new sheet
 * that is not yet committed under public/loops.
 */
export async function warmLoopSheet(
  catalog: PlayerCatalog,
  playerId: string,
  kind: PlayerImageKind,
  asset: PlayerAssetRow,
): Promise<boolean> {
  if (!isPlayerLoopImageKind(kind)) {
    return false;
  }
  if (readLoopPublicFile(asset.upstreamUrl)) {
    return true;
  }
  const sharedId = sharedLoopCacheId(asset.upstreamUrl) ?? playerId;
  if (readCachedImage(sharedId, kind)) {
    return true;
  }

  const tryFetch = async (url: string): Promise<boolean> => {
    const image = await fetchAllowlistedImage(url);
    writeCachedImage(sharedId, kind, image.bytes);
    return true;
  };

  try {
    return await tryFetch(asset.upstreamUrl);
  } catch (error) {
    if (!isExpiredImageError(error)) {
      return false;
    }
    try {
      await enrichDiscoveredPlayer(catalog, getRenderzSource(), playerId);
      const fresh = await catalog.getAsset(playerId, kind);
      if (!fresh) {
        return false;
      }
      if (readLoopPublicFile(fresh.upstreamUrl)) {
        return true;
      }
      return await tryFetch(fresh.upstreamUrl);
    } catch {
      return false;
    }
  }
}
