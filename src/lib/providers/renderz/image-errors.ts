import { ImageProxyRejectedError } from "@/lib/http/errors";

export function isExpiredImageError(error: unknown): boolean {
  return (
    error instanceof ImageProxyRejectedError &&
    error.message.includes("expired")
  );
}
