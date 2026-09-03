import { describe, expect, it } from "vitest";
import { RenderzClient } from "@/lib/providers/renderz/client";
import { UpstreamHttpError } from "@/lib/http/errors";
import { UpstreamLimiter, type UpstreamLimiterConfig } from "@/lib/http/upstream";

const fastConfig: UpstreamLimiterConfig = {
  concurrency: 1,
  requestsPerSecond: 100,
  maxRetries: 0,
  backoffBaseMs: 1,
  backoffMaxMs: 1,
  timeoutMs: 1000,
};

function clientWithFetch(
  fetchImpl: (url: string) => Promise<Response>,
): RenderzClient {
  return new RenderzClient({
    limiter: new UpstreamLimiter(fastConfig),
    config: fastConfig,
    fetchImpl,
  });
}

describe("RenderzClient", () => {
  it("fetches RenderZ page URLs", async () => {
    const client = clientWithFetch(async (url) => {
      expect(url).toBe("https://renderz.app/players");
      return new Response("<html>ok</html>", { status: 200 });
    });
    await expect(client.getText("https://renderz.app/players")).resolves.toBe(
      "<html>ok</html>",
    );
  });

  it("refuses non-RenderZ origins including api.renderz.app", async () => {
    const client = clientWithFetch(async () => {
      throw new Error("fetch should not run");
    });
    await expect(client.getText("https://api.renderz.app/backend")).rejects.toBeInstanceOf(
      UpstreamHttpError,
    );
    await expect(client.getText("http://renderz.app/players")).rejects.toBeInstanceOf(
      UpstreamHttpError,
    );
  });

  it("refuses RenderZ /api paths", async () => {
    const client = clientWithFetch(async () => {
      throw new Error("fetch should not run");
    });
    await expect(client.getText("https://renderz.app/api/players")).rejects.toBeInstanceOf(
      UpstreamHttpError,
    );
  });

  it("rejects oversized pages", async () => {
    const client = clientWithFetch(async () => {
      return new Response("x".repeat(2_000_001), { status: 200 });
    });
    await expect(client.getText("https://renderz.app/players")).rejects.toBeInstanceOf(
      UpstreamHttpError,
    );
  });
});
