import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ImageProxyRejectedError } from "@/lib/http/errors";

export type LookupAllFn = (
  hostname: string,
  options: { all: true },
) => Promise<ReadonlyArray<{ address: string; family?: number }>>;

export const ALLOWED_IMAGE_HOSTS = new Set([
  "images-v2.renderz.app",
  "images-v2-unsigned.renderz.app",
  "cdn-p2.frzdb.net",
]);

export const IMAGE_FETCH_HEADERS = {
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Referer: "https://www.renderz.app/",
} as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

const privateAddresses = new BlockList();
privateAddresses.addSubnet("0.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("10.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("127.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("169.254.0.0", 16, "ipv4");
privateAddresses.addSubnet("172.16.0.0", 12, "ipv4");
privateAddresses.addSubnet("192.168.0.0", 16, "ipv4");
privateAddresses.addAddress("::1", "ipv6");
privateAddresses.addSubnet("fc00::", 7, "ipv6");
privateAddresses.addSubnet("fe80::", 10, "ipv6");

export function isPrivateIp(address: string): boolean {
  const version = address.includes(":") ? "ipv6" : "ipv4";
  if (address.toLowerCase().startsWith("::ffff:")) {
    const mapped = address.slice(address.lastIndexOf(":") + 1);
    if (isIP(mapped) === 4) {
      return privateAddresses.check(mapped, "ipv4");
    }
  }
  try {
    return privateAddresses.check(address, version);
  } catch {
    return true;
  }
}

export function parseAllowedImageUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageProxyRejectedError("Invalid image URL");
  }
  if (parsed.protocol !== "https:") {
    throw new ImageProxyRejectedError("Image URL must be https");
  }
  if (parsed.username || parsed.password) {
    throw new ImageProxyRejectedError("Image URL must not include credentials");
  }
  if (parsed.port && parsed.port !== "443") {
    throw new ImageProxyRejectedError("Image URL port is not allowed");
  }
  if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    throw new ImageProxyRejectedError("Image host is not allowlisted");
  }
  return parsed;
}

export async function resolvePublicAddresses(
  hostname: string,
  lookupFn: LookupAllFn = dnsLookup,
): Promise<string[]> {
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new ImageProxyRejectedError("Image host resolved to a private address");
    }
    return [hostname];
  }
  const results = await lookupFn(hostname, { all: true });
  const addresses = results.map((result) => result.address);
  if (addresses.length === 0) {
    throw new ImageProxyRejectedError("Image host did not resolve");
  }
  if (addresses.some((address) => isPrivateIp(address))) {
    throw new ImageProxyRejectedError("Image host resolved to a private address");
  }
  return addresses;
}

export function isAllowedImageContentType(
  contentType: string | null,
  bytes: Uint8Array,
): boolean {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime.startsWith("image/")) {
    return true;
  }
  if (mime === "application/octet-stream" || mime === "") {
    return looksLikeImage(bytes);
  }
  return false;
}

export function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const gif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
  const webp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return png || jpeg || gif || webp;
}

export function sniffImageContentType(
  contentType: string | null,
  bytes: Uint8Array,
): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime.startsWith("image/")) {
    return mime;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49) {
    return "image/gif";
  }
  if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    return "image/webp";
  }
  return mime || "application/octet-stream";
}

export const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect fill="#e5e5e5" width="128" height="128"/><text x="64" y="70" text-anchor="middle" font-size="14" fill="#737373">No image</text></svg>`;
