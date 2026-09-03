import { ImageProxyRejectedError } from "@/lib/http/errors";
import {
  IMAGE_FETCH_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
  isAllowedImageContentType,
  parseAllowedImageUrl,
  resolvePublicAddresses,
  type LookupAllFn,
} from "@/lib/providers/renderz/image-policy";

export type ImageFetchImpl = (url: string, init: RequestInit) => Promise<Response>;
export type LookupFn = LookupAllFn;

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > maxBytes) {
    throw new ImageProxyRejectedError("Image exceeded size limit");
  }
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new ImageProxyRejectedError("Image exceeded size limit");
    }
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ImageProxyRejectedError("Image exceeded size limit");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function fetchAllowlistedImage(
  url: string,
  options: {
    fetchImpl?: ImageFetchImpl;
    lookupFn?: LookupAllFn;
    timeoutMs?: number;
    maxBytes?: number;
  } = {},
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? IMAGE_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;

  const requestOnce = async (target: string, redirectsLeft: number): Promise<{ bytes: Uint8Array; contentType: string }> => {
    const parsed = parseAllowedImageUrl(target);
    await resolvePublicAddresses(parsed.hostname, options.lookupFn);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(parsed.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/*,application/octet-stream" },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ImageProxyRejectedError("Image fetch timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsLeft <= 0) {
        throw new ImageProxyRejectedError("Too many image redirects");
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new ImageProxyRejectedError("Image redirect missing Location");
      }
      const next = new URL(location, parsed);
      return requestOnce(next.toString(), redirectsLeft - 1);
    }

    if (response.status === 403) {
      throw new ImageProxyRejectedError("Image signature expired");
    }
    if (!response.ok) {
      throw new ImageProxyRejectedError("Image fetch failed");
    }

    const bytes = await readLimited(response, maxBytes);
    const contentType = response.headers.get("content-type");
    if (!isAllowedImageContentType(contentType, bytes)) {
      throw new ImageProxyRejectedError("Unexpected image content type");
    }
    return {
      bytes,
      contentType: contentType?.split(";")[0]?.trim() || "application/octet-stream",
    };
  };

  return requestOnce(url, 1);
}
