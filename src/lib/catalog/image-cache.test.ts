import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
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
