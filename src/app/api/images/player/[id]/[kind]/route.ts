import { getPlayerCatalog } from "@/lib/catalog/runtime";
import {
  readCachedImage,
  writeCachedImage,
} from "@/lib/catalog/image-cache";
import { enrichDiscoveredPlayer } from "@/lib/catalog/enrichment";
import { isDev } from "@/lib/dev";
import {
  isPlayerIconImageKind,
  playerImageKindSchema,
  playerIdSchema,
  type PlayerAssetRow,
  type PlayerImageKind,
} from "@/lib/domain/player";
import {
  ImageProxyRejectedError,
  isAppError,
  NotFoundError,
} from "@/lib/http/errors";
import { PLACEHOLDER_SVG } from "@/lib/providers/renderz/image-policy";
import { isExpiredImageError } from "@/lib/providers/renderz/image-errors";
import { fetchAllowlistedImage } from "@/lib/providers/renderz/image-proxy";
import { getRenderzSource } from "@/lib/providers/renderz/renderz-source";
import { ZodError } from "zod";
import type { PlayerCatalog } from "@/lib/catalog/repository";

export const runtime = "nodejs";

function placeholder(): Response {
  return new Response(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function imageResponse(bytes: Uint8Array, contentType: string, immutable: boolean): Response {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": immutable
        ? "public, max-age=86400, stale-while-revalidate=604800"
        : "private, max-age=3600",
    },
  });
}

async function resolveAsset(
  catalog: PlayerCatalog,
  playerId: string,
  kind: PlayerImageKind,
): Promise<PlayerAssetRow | null> {
  const own = await catalog.getAsset(playerId, kind);
  if (own) {
    return own;
  }
  if (!isPlayerIconImageKind(kind)) {
    return null;
  }
  return catalog.findSharedIconAsset(kind);
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

    try {
      const image = await fetchAndCache(id, kind, asset.upstreamUrl);
      return imageResponse(image.bytes, image.contentType, false);
    } catch (error) {
      if (isExpiredImageError(error) && isDev) {
        try {
          await enrichDiscoveredPlayer(catalog, getRenderzSource(), id);
          asset = await resolveAsset(catalog, id, kind);
          if (asset) {
            const image = await fetchAndCache(id, kind, asset.upstreamUrl);
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
      return new Response(JSON.stringify({ error: "Invalid image request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
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
