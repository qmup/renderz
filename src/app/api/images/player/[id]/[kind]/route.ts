import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { enrichDiscoveredPlayer } from "@/lib/catalog/enrichment";
import {
  playerImageKindSchema,
  playerIdSchema,
} from "@/lib/domain/player";
import { ImageProxyRejectedError, isAppError, NotFoundError } from "@/lib/http/errors";
import { PLACEHOLDER_SVG } from "@/lib/providers/renderz/image-policy";
import { fetchAllowlistedImage } from "@/lib/providers/renderz/image-proxy";
import { getRenderzSource } from "@/lib/providers/renderz/renderz-source";
import { ZodError } from "zod";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  try {
    const params = await context.params;
    const id = playerIdSchema.parse(params.id);
    const kind = playerImageKindSchema.parse(params.kind);
    const catalog = getPlayerCatalog();
    if (!(await catalog.exists(id))) {
      throw new NotFoundError();
    }

    const loadAsset = async () => catalog.getAsset(id, kind);
    let asset = await loadAsset();
    if (!asset) {
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const image = await fetchAllowlistedImage(asset.upstreamUrl);
      return new Response(Buffer.from(image.bytes), {
        status: 200,
        headers: {
          "Content-Type": image.contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (error) {
      if (
        error instanceof ImageProxyRejectedError &&
        error.message.includes("expired")
      ) {
        await enrichDiscoveredPlayer(catalog, getRenderzSource(), id);
        asset = await loadAsset();
        if (asset) {
          const image = await fetchAllowlistedImage(asset.upstreamUrl);
          return new Response(Buffer.from(image.bytes), {
            status: 200,
            headers: {
              "Content-Type": image.contentType,
              "Cache-Control": "private, max-age=3600",
            },
          });
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
    if (isAppError(error)) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return placeholder();
  }
}
