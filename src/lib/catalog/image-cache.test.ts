import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isUsableImageCacheFile,
  readCachedImage,
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
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns null when the cache file is missing", () => {
    expect(readCachedImage("missing", "card", os.tmpdir())).toBeNull();
  });

  it("rejects Git LFS pointer files as unusable caches", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "image-cache-lfs-"));
    try {
      const dataDir = path.join(cwd, "data");
      mkdirSync(dataDir, { recursive: true });
      const pointer = path.join(dataDir, "images.sqlite");
      writeFileSync(
        pointer,
        "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 1\n",
      );
      expect(isUsableImageCacheFile(pointer)).toBe(false);
      expect(readCachedImage("30920616", "card", cwd)).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
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
