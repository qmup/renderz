import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadImageCacheFromBlob,
  IMAGE_CACHE_BLOB_PATHNAME,
  uploadImageCacheToBlob,
} from "@/lib/catalog/image-cache-blob";

const get = vi.hoisted(() => vi.fn());
const put = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({
  get,
  put,
}));

function sqliteBytes(): Buffer {
  const header = Buffer.alloc(64, 0);
  header.write("SQLite format 3\0", 0, "utf8");
  return header;
}

describe("image cache blob", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "image-cache-blob-"));
    get.mockReset();
    put.mockReset();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("uploads the sqlite file to a stable private pathname", async () => {
    const filePath = path.join(dir, "images.sqlite");
    writeFileSync(filePath, sqliteBytes());
    put.mockResolvedValue({
      pathname: IMAGE_CACHE_BLOB_PATHNAME,
      etag: '"abc"',
    });

    const result = await uploadImageCacheToBlob(filePath);

    expect(result).toEqual({
      pathname: IMAGE_CACHE_BLOB_PATHNAME,
      etag: '"abc"',
    });
    expect(put).toHaveBeenCalledTimes(1);
    const [pathname, body, options] = put.mock.calls[0] as [
      string,
      unknown,
      Record<string, unknown>,
    ];
    expect(pathname).toBe(IMAGE_CACHE_BLOB_PATHNAME);
    expect(body).toBeInstanceOf(Buffer);
    expect(options).toMatchObject({
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: true,
    });
  });

  it("downloads a new sqlite when the blob etag changed", async () => {
    const dest = path.join(dir, "images.sqlite");
    const bytes = sqliteBytes();
    get.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      blob: { etag: '"v2"' },
    });

    await expect(downloadImageCacheFromBlob(dest)).resolves.toBe("updated");
    expect(readFileSync(dest)).toEqual(bytes);
    expect(readFileSync(`${dest}.etag`, "utf8")).toBe('"v2"');
    expect(get).toHaveBeenCalledWith(IMAGE_CACHE_BLOB_PATHNAME, {
      access: "private",
      ifNoneMatch: undefined,
      useCache: false,
    });
  });

  it("skips the download when the local etag matches", async () => {
    const dest = path.join(dir, "images.sqlite");
    writeFileSync(dest, sqliteBytes());
    writeFileSync(`${dest}.etag`, '"v2"');
    get.mockResolvedValue({
      statusCode: 304,
      stream: null,
      blob: { etag: '"v2"' },
    });

    await expect(downloadImageCacheFromBlob(dest)).resolves.toBe("unchanged");
    expect(get).toHaveBeenCalledWith(IMAGE_CACHE_BLOB_PATHNAME, {
      access: "private",
      ifNoneMatch: '"v2"',
      useCache: false,
    });
  });

  it("returns missing when the blob is not uploaded yet", async () => {
    get.mockResolvedValue(null);
    await expect(
      downloadImageCacheFromBlob(path.join(dir, "images.sqlite")),
    ).resolves.toBe("missing");
  });
});
