# FC Mobile player browser

Personal, read-only Next.js catalog. **The browser never talks to RenderZ** — only this origin (`/players`, `/api/players`, `/api/images/player/:id/:kind`). Public RenderZ HTML is fetched server-side at about one request per second.

This is not a RenderZ client, not a private-API wrapper, and not a UI clone.

## Constraints

- Do not call `api.renderz.app` or `renderz.app/api/*`.
- Do not bypass signed image `verify` params, login, or Cloudflare.
- Domain models (`Player` / `PlayerSummary`) contain **no URLs**. The UI builds image paths from `id` + `kind`.
- On-demand enrichment is **catalog-only**: unknown ids 404.
- Public sitemaps list **10,000** player URLs. RenderZ marketing copy claims 30,000+; treat the sitemap as the discovery set.
- The catalog is Aurora PostgreSQL. Card art and LOOP sheets are on S3, served through CloudFront.
- The catalog keeps players it has already stored. Sync adds missing cards and refreshes promo cards from the last 14 days. Programs 39–106 on renderz.app/programs are skipped; newer events and programs 1–38, Icons, and Heroes are kept.

## Setup

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000/players](http://localhost:3000/players). Listing defaults to **newest added first**. On localhost, the first visit each local calendar day silently discovers new sitemap ids at the head of the sitemap (header shows progress; a toast appears when new players were added). Later visits the same day skip discovery. Production on Vercel does not run this — GitHub Actions runs `npm run catalog:sync` at 21:30 and 23:30 Asia/Ho_Chi_Minh. Copy `.env.example` for Aurora, S3, and the `RENDERZ_*` limiter.

`npm run seed` upserts the public `/players` listing then enriches those ids only. Re-run skips rows already at the current parse version. `--summaries-only` skips detail fetches.

## Daily production catalog

GitHub Actions workflow `.github/workflows/daily-catalog.yml` runs at **21:30 and 23:30 Asia/Ho_Chi_Minh**, on GitHub's runners, so the laptop can be off. Each run reads the sitemap head, refreshes promo cards added in the last 14 days, backfills kept programs (including a new event once one of its cards is stored), then missing base gold/silver. It stops before the job timeout. The next run continues. Cards older than that window stay as stored. The browser loads card art from CloudFront.

## Catalog check

```bash
npm run catalog:verify
```

Prints how many players are stored. It does not delete older players.

## Ingest

Discovery enqueue does not fetch player pages:

```bash
npm run ingest sync           # enqueue sitemap ids + stale refreshes
npm run ingest run -- --limit 10
```

Parser v2 stops copying the whole player page into `programName`. Re-run seed or ingest to rebuild old rows. Listing and detail show a **Stale** hint when `parseVersion` is behind or `fetchedAt` is older than 24h. Detail also surfaces upstream 429s (`Retry-After`) without exposing RenderZ URLs.

## Images

Listing card art is served from CloudFront (`/player-art/...`). The UI falls back to `GET /api/images/player/:id/:kind` (allowlisted CDN hosts, SSRF controls, placeholder on failure). Signed CDN URLs never reach the browser. Expired signatures trigger a catalog refresh for that id, then one retry.

## Fixtures

Minimized extracted blobs are committed. Full HTML / `__data.json` dumps are gitignored:

```bash
npm run probe:renderz
```

`__data.json` is an optional SvelteKit transport, not a contract. HTML is the durable public page.

## Stack

Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Query (listing only), Zod, Aurora PostgreSQL + Drizzle. Unit tests use an in-memory SQLite catalog.
