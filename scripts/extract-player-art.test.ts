import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeImageCache,
  writeCachedImage,
} from "@/lib/catalog/image-cache";
import { extractPlayerArt } from "./extract-player-art";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("extractPlayerArt", () => {
  const dirs: string[] = [];

  afterEach(() => {
    closeImageCache();
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes packed sqlite rows into public/player-art", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "extract-player-art-"));
    dirs.push(cwd);
    writeCachedImage("30920616", "card", png, cwd);
    closeImageCache();

    expect(extractPlayerArt(cwd)).toBe(1);
    expect(
      readFileSync(path.join(cwd, "public", "player-art", "30920616", "card.png")),
    ).toEqual(png);
  });

  it("skips when the sqlite cache is missing", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "extract-player-art-"));
    dirs.push(cwd);
    expect(extractPlayerArt(cwd)).toBe(0);
  });

  it("throws when the sqlite cache is required but missing", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "extract-player-art-"));
    dirs.push(cwd);
    expect(() => extractPlayerArt(cwd, { required: true })).toThrow(
      /No usable image cache/,
    );
  });
});
