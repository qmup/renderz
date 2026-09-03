import {
  fetchUpstream,
  getSharedUpstreamLimiter,
  loadUpstreamLimiterConfig,
  type FetchLike,
  type UpstreamLimiter,
  type UpstreamLimiterConfig,
} from "@/lib/http/upstream";
import { UpstreamHttpError } from "@/lib/http/errors";
import { RENDERZ_ORIGIN, RENDERZ_PAGE_HEADERS } from "@/lib/providers/renderz/urls";

const MAX_PAGE_BYTES = 2_000_000;

export type RenderzClientOptions = {
  limiter?: UpstreamLimiter;
  config?: UpstreamLimiterConfig;
  fetchImpl?: FetchLike;
};

export class RenderzClient {
  private readonly limiter: UpstreamLimiter;
  private readonly config: UpstreamLimiterConfig;
  private readonly fetchImpl?: FetchLike;

  constructor(options: RenderzClientOptions = {}) {
    this.config = options.config ?? loadUpstreamLimiterConfig();
    this.limiter = options.limiter ?? getSharedUpstreamLimiter();
    this.fetchImpl = options.fetchImpl;
  }

  async getText(url: string): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.origin !== RENDERZ_ORIGIN) {
      throw new UpstreamHttpError(400, "Refusing to fetch a non-RenderZ page URL");
    }
    if (parsed.pathname.startsWith("/api/")) {
      throw new UpstreamHttpError(400, "Refusing to fetch RenderZ /api paths");
    }

    const response = await fetchUpstream(url, { headers: RENDERZ_PAGE_HEADERS }, {
      limiter: this.limiter,
      config: this.config,
      fetchImpl: this.fetchImpl,
    });

    if (response.status === 404) {
      throw new UpstreamHttpError(404, "Upstream page not found");
    }
    if (!response.ok) {
      throw new UpstreamHttpError(response.status);
    }

    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > MAX_PAGE_BYTES) {
      throw new UpstreamHttpError(502, "Upstream page exceeded size limit");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_PAGE_BYTES) {
      throw new UpstreamHttpError(502, "Upstream page exceeded size limit");
    }
    return buffer.toString("utf8");
  }
}
