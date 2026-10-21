import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loopPublicSrc,
  readCachedImage,
  sharedLoopCacheId,
  writeCachedImage,
} from "@/lib/catalog/image-cache";
import { ImageProxyRejectedError } from "@/lib/http/errors";
import { isExpiredImageError } from "@/lib/providers/renderz/image-errors";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("image cache", () => {
  it("round-trips listing card bytes", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "image-cache-"));
    try {
      writeCachedImage("30920616", "card", png, cwd);
      const cached = readCachedImage("30920616", "card", cwd);
      expect(cached?.contentType).toBe("image/png");
      expect(cached?.bytes.byteLength).toBe(png.byteLength);
      expect(readCachedImage("other-player", "card", cwd)).toBeNull();
      writeCachedImage("30920616", "playstyle-987634376", png, cwd);
      expect(
        readCachedImage("other-player", "playstyle-987634376", cwd)?.bytes.byteLength,
      ).toBe(png.byteLength);
      writeCachedImage("30920616", "untradeable", png, cwd);
      expect(
        readCachedImage("other-player", "untradeable", cwd)?.bytes.byteLength,
      ).toBe(png.byteLength);
      writeCachedImage("30920616", "star-shard", png, cwd);
      expect(
        readCachedImage("other-player", "star-shard", cwd)?.bytes.byteLength,
      ).toBe(png.byteLength);
      writeCachedImage("loop:sprite_23_champions26_LIVE_LFC_LOOP", "loop-f45", png, cwd);
      expect(
        readCachedImage("loop:sprite_23_champions26_LIVE_LFC_LOOP", "loop-f45", cwd)
          ?.bytes.byteLength,
      ).toBe(png.byteLength);
      expect(readCachedImage("24048619", "loop-f45", cwd)).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns null when the cache file is missing", () => {
    expect(readCachedImage("missing", "card", os.tmpdir())).toBeNull();
  });

});

describe("isExpiredImageError", () => {
  it("matches signature-expired proxy errors only", () => {
    expect(isExpiredImageError(new ImageProxyRejectedError("Image signature expired"))).toBe(
      true,
    );
    expect(isExpiredImageError(new ImageProxyRejectedError("Image fetch failed"))).toBe(
      false,
    );
    expect(isExpiredImageError(new Error("Image signature expired"))).toBe(false);
  });
});

describe("sharedLoopCacheId", () => {
  it("keys LOOP sheets by pathname without the signed query", () => {
    expect(
      sharedLoopCacheId(
        "https://images-v2.renderz.app/sprite_23_champions26_LIVE_LFC_LOOP?verify=1",
      ),
    ).toBe("loop:sprite_23_champions26_LIVE_LFC_LOOP");
    expect(sharedLoopCacheId("not-a-url")).toBeUndefined();
    expect(
      loopPublicSrc(
        "https://images-v2.renderz.app/sprite_23_champions26_LIVE_LFC_LOOP?verify=1",
      ),
    ).toBe("/loops/sprite_23_champions26_LIVE_LFC_LOOP.png");
  });
});
