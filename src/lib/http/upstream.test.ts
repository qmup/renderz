import { describe, expect, it } from "vitest";
import {
  computeBackoffMs,
  fetchUpstream,
  isRetryableStatus,
  parseRetryAfterMs,
  UpstreamLimiter,
  type UpstreamLimiterConfig,
} from "@/lib/http/upstream";
import { RateLimitedError, UpstreamHttpError } from "@/lib/http/errors";

const config: UpstreamLimiterConfig = {
  concurrency: 1,
  requestsPerSecond: 1,
  maxRetries: 2,
  backoffBaseMs: 10,
  backoffMaxMs: 100,
  timeoutMs: 1_000,
};

describe("upstream limiter helpers", () => {
  it("parses Retry-After seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("2", 0)).toBe(2000);
    expect(parseRetryAfterMs("Sun, 03 Sep 2026 00:00:02 GMT", Date.parse("Sun, 03 Sep 2026 00:00:00 GMT"))).toBe(
      2000,
    );
    expect(parseRetryAfterMs("nope", 0)).toBeUndefined();
  });

  it("retries 429 and 5xx only", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(200)).toBe(false);
  });

  it("respects Retry-After over exponential backoff", () => {
    expect(computeBackoffMs(0, config, 80)).toBe(80);
    expect(computeBackoffMs(8, config, 1)).toBe(100);
  });
});

describe("UpstreamLimiter", () => {
  it("runs with concurrency 1", async () => {
    let current = 0;
    let max = 0;
    const limiter = new UpstreamLimiter(config, {
      now: () => 0,
      sleep: async () => undefined,
    });
    await Promise.all(
      [1, 2, 3].map(() =>
        limiter.schedule(async () => {
          current += 1;
          max = Math.max(max, current);
          current -= 1;
        }),
      ),
    );
    expect(max).toBe(1);
  });
});

describe("fetchUpstream", () => {
  it("retries 429 using Retry-After then succeeds", async () => {
    const sleeps: number[] = [];
    const limiter = new UpstreamLimiter(config, {
      now: () => 1_000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    let calls = 0;
    const response = await fetchUpstream(
      "https://renderz.app/players",
      undefined,
      {
        limiter,
        config,
        clock: {
          now: () => 1_000,
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        },
        fetchImpl: async () => {
          calls += 1;
          if (calls === 1) {
            return new Response("slow", {
              status: 429,
              headers: { "Retry-After": "1" },
            });
          }
          return new Response("ok", { status: 200 });
        },
      },
    );
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(sleeps).toContain(1000);
  });

  it("throws after exhausting 5xx retries", async () => {
    const limiter = new UpstreamLimiter(config, {
      now: () => 0,
      sleep: async () => undefined,
    });
    await expect(
      fetchUpstream("https://renderz.app/players", undefined, {
        limiter,
        config: { ...config, maxRetries: 1 },
        clock: { now: () => 0, sleep: async () => undefined },
        fetchImpl: async () => new Response("nope", { status: 503 }),
      }),
    ).rejects.toBeInstanceOf(UpstreamHttpError);
  });

  it("throws RateLimitedError when 429 persists", async () => {
    const limiter = new UpstreamLimiter(config, {
      now: () => 0,
      sleep: async () => undefined,
    });
    await expect(
      fetchUpstream("https://renderz.app/players", undefined, {
        limiter,
        config: { ...config, maxRetries: 0 },
        clock: { now: () => 0, sleep: async () => undefined },
        fetchImpl: async () =>
          new Response("nope", { status: 429, headers: { "Retry-After": "3" } }),
      }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });
});
