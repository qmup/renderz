import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LIST_THUMB_EDGE } from "@/lib/images";
import { encodeListThumb } from "@/lib/catalog/list-thumb";

describe("encodeListThumb", () => {
  it("shrinks a large png to a webp within the list edge", async () => {
    const png = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 4,
        background: { r: 20, g: 40, b: 80, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const thumb = await encodeListThumb(png);
    const meta = await sharp(thumb).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(LIST_THUMB_EDGE);
    expect(meta.height).toBe(LIST_THUMB_EDGE / 2);
    expect(thumb.byteLength).toBeLessThan(png.byteLength);
  });

  it("does not enlarge an image that is already small", async () => {
    const png = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const meta = await sharp(await encodeListThumb(png)).metadata();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(32);
  });
});
