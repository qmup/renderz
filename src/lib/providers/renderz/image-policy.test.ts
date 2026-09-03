import { describe, expect, it } from "vitest";
import {
  isPrivateIp,
  parseAllowedImageUrl,
  looksLikeImage,
  isAllowedImageContentType,
} from "@/lib/providers/renderz/image-policy";
import { fetchAllowlistedImage } from "@/lib/providers/renderz/image-proxy";
import { ImageProxyRejectedError } from "@/lib/http/errors";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const publicLookup = async () => [{ address: "1.1.1.1", family: 4 as const }];

describe("image-policy", () => {
  it("allows signed RenderZ image hosts and rejects others", () => {
    expect(
      parseAllowedImageUrl("https://images-v2.renderz.app/player_25?verify=1-a").hostname,
    ).toBe("images-v2.renderz.app");
    expect(() => parseAllowedImageUrl("http://images-v2.renderz.app/x")).toThrow(
      ImageProxyRejectedError,
    );
    expect(() => parseAllowedImageUrl("https://evil.example/x")).toThrow(ImageProxyRejectedError);
    expect(() => parseAllowedImageUrl("https://127.0.0.1/x")).toThrow(ImageProxyRejectedError);
  });

  it("detects private IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("accepts PNG magic when content-type is octet-stream", () => {
    expect(looksLikeImage(png)).toBe(true);
    expect(isAllowedImageContentType("application/octet-stream", png)).toBe(true);
    expect(isAllowedImageContentType("text/html", png)).toBe(false);
  });
});

describe("fetchAllowlistedImage", () => {
  it("fetches an allowlisted image without following off-allowlist redirects", async () => {
    const image = await fetchAllowlistedImage(
      "https://images-v2.renderz.app/card?verify=1-a",
      {
        lookupFn: publicLookup,
        fetchImpl: async () =>
          new Response(png, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          }),
      },
    );
    expect(image.contentType).toBe("image/png");
    expect(image.bytes.byteLength).toBe(png.byteLength);
  });

  it("follows one allowlisted redirect", async () => {
    let calls = 0;
    const image = await fetchAllowlistedImage(
      "https://images-v2.renderz.app/old",
      {
        lookupFn: publicLookup,
        fetchImpl: async (url) => {
          calls += 1;
          if (url.includes("/old")) {
            return new Response(null, {
              status: 302,
              headers: { Location: "https://images-v2-unsigned.renderz.app/new" },
            });
          }
          return new Response(png, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          });
        },
      },
    );
    expect(calls).toBe(2);
    expect(image.bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects an allowlisted host that resolves to a private IP", async () => {
    await expect(
      fetchAllowlistedImage("https://images-v2.renderz.app/card", {
        lookupFn: async () => [{ address: "127.0.0.1", family: 4 }],
        fetchImpl: async () => {
          throw new Error("fetch should not run");
        },
      }),
    ).rejects.toBeInstanceOf(ImageProxyRejectedError);
  });

  it("rejects a redirect off the allowlist", async () => {
    await expect(
      fetchAllowlistedImage("https://images-v2.renderz.app/old", {
        lookupFn: publicLookup,
        fetchImpl: async () =>
          new Response(null, {
            status: 302,
            headers: { Location: "https://127.0.0.1/secret" },
          }),
      }),
    ).rejects.toBeInstanceOf(ImageProxyRejectedError);
  });

  it("rejects oversized payloads", async () => {
    await expect(
      fetchAllowlistedImage("https://images-v2.renderz.app/big", {
        lookupFn: publicLookup,
        maxBytes: 8,
        fetchImpl: async () =>
          new Response(png, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          }),
      }),
    ).rejects.toBeInstanceOf(ImageProxyRejectedError);
  });
});
