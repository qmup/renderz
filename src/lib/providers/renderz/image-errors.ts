import { ImageProxyRejectedError } from "@/lib/http/errors";

/** Cloudflare's datacenter block, not a signed-URL expiry. */
export function isUpstreamBlockBody(bodyText: string): boolean {
  const text = bodyText.replace(/\s+/g, " ").trim();
  if (text === "Unauthorised" || text === "Unauthorized") {
    return true;
  }
  if (/just a moment/i.test(text)) {
    return true;
  }
  return /attention required/i.test(text) && /cloudflare/i.test(text);
}

export function imageHttpRejectionMessage(status: number, bodyText: string): string {
  if (status === 403 && isUpstreamBlockBody(bodyText)) {
    return "Upstream blocked";
  }
  if (status === 403) {
    return "Image signature expired";
  }
  return "Image fetch failed";
}

export function isExpiredImageError(error: unknown): boolean {
  return (
    error instanceof ImageProxyRejectedError &&
    error.message.includes("expired")
  );
}

export function isUpstreamBlockedError(error: unknown): boolean {
  return (
    error instanceof ImageProxyRejectedError &&
    error.message === "Upstream blocked"
  );
}
