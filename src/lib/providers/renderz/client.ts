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
const MAX_SEARCH_BYTES = 8_000_000;

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
      throw await upstreamHttpError(response);
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

  /** Player search. Page fetches stay blocked from `/api`; this is the one exception. */
  async getSearchJson(encodedQuery: string): Promise<unknown> {
    if (!/^[A-Za-z0-9_-]+$/.test(encodedQuery)) {
      throw new UpstreamHttpError(400, "Invalid RenderZ search query");
    }
    const url = `${RENDERZ_ORIGIN}/api/search/23?v=1&q=${encodedQuery}`;
    const response = await fetchUpstream(
      url,
      {
        headers: {
          ...RENDERZ_PAGE_HEADERS,
          Accept: "application/json",
        },
      },
      {
        limiter: this.limiter,
        config: this.config,
        fetchImpl: this.fetchImpl,
      },
    );
    if (!response.ok) {
      throw await upstreamHttpError(response);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_SEARCH_BYTES) {
      throw new UpstreamHttpError(502, "Upstream search page exceeded size limit");
    }
    return JSON.parse(buffer.toString("utf8")) as unknown;
  }
}

async function upstreamHttpError(response: Response): Promise<UpstreamHttpError> {
  const detail = await upstreamStatusDetail(response);
  const message = detail
    ? `Upstream HTTP ${response.status} ${detail}`
    : `Upstream HTTP ${response.status}`;
  return new UpstreamHttpError(response.status, message);
}

/** Short printable body, so a Cloudflare block is visible in the job log. */
async function upstreamStatusDetail(response: Response): Promise<string> {
  try {
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > 200) {
      return "";
    }
    const buffer = Buffer.from(await response.arrayBuffer()).subarray(0, 80);
    const text = buffer
      .toString("utf8")
      .replace(/[^\x20-\x7E]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || /https?:\/\//i.test(text)) {
      return "";
    }
    return text.slice(0, 40);
  } catch {
    return "";
  }
}
