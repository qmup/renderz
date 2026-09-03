export type AppErrorCode =
  | "NOT_FOUND"
  | "UNDISCOVERED_PLAYER"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_HTTP"
  | "PARSE_ERROR"
  | "RATE_LIMITED"
  | "IMAGE_PROXY_REJECTED";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class UndiscoveredPlayerError extends AppError {
  constructor(playerId: string) {
    super(
      "UNDISCOVERED_PLAYER",
      `Player ${playerId} is not in the catalog`,
      404,
    );
    this.name = "UndiscoveredPlayerError";
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message = "Upstream request timed out") {
    super("UPSTREAM_TIMEOUT", message, 504);
    this.name = "UpstreamTimeoutError";
  }
}

export class UpstreamHttpError extends AppError {
  readonly upstreamStatus: number;

  constructor(upstreamStatus: number, message?: string) {
    super(
      "UPSTREAM_HTTP",
      message ?? `Upstream HTTP ${upstreamStatus}`,
      upstreamStatus >= 500 ? 502 : 502,
    );
    this.name = "UpstreamHttpError";
    this.upstreamStatus = upstreamStatus;
  }
}

export class ParseError extends AppError {
  constructor(message = "Failed to parse upstream player data") {
    super("PARSE_ERROR", message, 502);
    this.name = "ParseError";
  }
}

export class RateLimitedError extends AppError {
  readonly retryAfterMs?: number;

  constructor(message = "Upstream rate limited", retryAfterMs?: number) {
    super("RATE_LIMITED", message, 429);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ImageProxyRejectedError extends AppError {
  constructor(message = "Image proxy rejected the upstream response") {
    super("IMAGE_PROXY_REJECTED", message, 502);
    this.name = "ImageProxyRejectedError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function publicErrorMessage(error: AppError): string {
  if (/https?:\/\//i.test(error.message) || /renderz\.app/i.test(error.message)) {
    return error.code.toLowerCase().replaceAll("_", " ");
  }
  return error.message;
}
