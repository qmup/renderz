import { RateLimitedError, UpstreamHttpError, UpstreamTimeoutError } from "@/lib/http/errors";

export type UpstreamLimiterConfig = {
  concurrency: number;
  requestsPerSecond: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  timeoutMs: number;
};

export type UpstreamLimiterClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const defaultClock: UpstreamLimiterClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function envNumber(
  name: string,
  fallback: number,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadUpstreamLimiterConfig(
  env: NodeJS.ProcessEnv = process.env,
): UpstreamLimiterConfig {
  return {
    concurrency: Math.max(1, envNumber("RENDERZ_MAX_CONCURRENCY", 1, env)),
    requestsPerSecond: Math.max(0.1, envNumber("RENDERZ_REQUESTS_PER_SECOND", 1, env)),
    maxRetries: Math.max(0, envNumber("RENDERZ_MAX_RETRIES", 4, env)),
    backoffBaseMs: Math.max(1, envNumber("RENDERZ_BACKOFF_BASE_MS", 500, env)),
    backoffMaxMs: Math.max(1, envNumber("RENDERZ_BACKOFF_MAX_MS", 8000, env)),
    timeoutMs: Math.max(1, envNumber("RENDERZ_REQUEST_TIMEOUT_MS", 15_000, env)),
  };
}

export function parseRetryAfterMs(
  header: string | null,
  now: number,
): number | undefined {
  if (!header) {
    return undefined;
  }
  const trimmed = header.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Number(trimmed) * 1000);
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, date - now);
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function computeBackoffMs(
  attempt: number,
  config: Pick<UpstreamLimiterConfig, "backoffBaseMs" | "backoffMaxMs">,
  retryAfterMs?: number,
): number {
  const exp = Math.min(
    config.backoffMaxMs,
    config.backoffBaseMs * 2 ** attempt,
  );
  return Math.min(config.backoffMaxMs, Math.max(exp, retryAfterMs ?? 0));
}

export class UpstreamLimiter {
  private active = 0;
  private nextSlotAt = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly config: UpstreamLimiterConfig,
    private readonly clock: UpstreamLimiterClock = defaultClock,
  ) {}

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryStart = () => {
        if (this.active >= this.config.concurrency) {
          this.queue.push(tryStart);
          return;
        }
        this.active += 1;
        const minInterval = 1000 / this.config.requestsPerSecond;
        const startAt = Math.max(this.clock.now(), this.nextSlotAt);
        const wait = Math.max(0, startAt - this.clock.now());
        this.nextSlotAt = startAt + minInterval;
        if (wait > 0) {
          void this.clock.sleep(wait).then(() => resolve());
          return;
        }
        resolve();
      };
      tryStart();
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    next?.();
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchUpstream(
  url: string,
  init: RequestInit | undefined,
  options: {
    limiter: UpstreamLimiter;
    config: UpstreamLimiterConfig;
    fetchImpl?: FetchLike;
    clock?: UpstreamLimiterClock;
  },
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const clock = options.clock ?? defaultClock;
  let attempt = 0;

  while (true) {
    const response = await options.limiter.schedule(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.config.timeoutMs);
      try {
        return await fetchImpl(url, {
          ...init,
          signal: init?.signal ?? controller.signal,
        });
      } catch (error) {
        if (controller.signal.aborted && !init?.signal?.aborted) {
          throw new UpstreamTimeoutError();
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });

    if (!isRetryableStatus(response.status) || attempt >= options.config.maxRetries) {
      if (isRetryableStatus(response.status) && attempt >= options.config.maxRetries) {
        if (response.status === 429) {
          throw new RateLimitedError(
            "Upstream rate limited after retries",
            parseRetryAfterMs(response.headers.get("retry-after"), clock.now()),
          );
        }
        throw new UpstreamHttpError(response.status);
      }
      return response;
    }

    const retryAfterMs = parseRetryAfterMs(
      response.headers.get("retry-after"),
      clock.now(),
    );
    const delay = computeBackoffMs(attempt, options.config, retryAfterMs);
    attempt += 1;
    await clock.sleep(delay);
  }
}

let sharedLimiter: UpstreamLimiter | undefined;

export function getSharedUpstreamLimiter(): UpstreamLimiter {
  sharedLimiter ??= new UpstreamLimiter(loadUpstreamLimiterConfig());
  return sharedLimiter;
}
