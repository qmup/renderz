import sharp from "sharp";
import { LIST_THUMB_EDGE } from "@/lib/images";

export const LIST_THUMB_CONTENT_TYPE = "image/webp";
export const LIST_THUMB_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

/** Square-ish WebP whose longest edge is LIST_THUMB_EDGE. Does not enlarge. */
export async function encodeListThumb(png: Uint8Array): Promise<Uint8Array> {
  const webp = await sharp(Buffer.from(png))
    .resize(LIST_THUMB_EDGE, LIST_THUMB_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
  return new Uint8Array(webp);
}
