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
- The catalog keeps players it has already stored. Sync adds missing cards and refreshes promo cards from the last 14 days. Older seasons on renderz.app/programs are skipped; the newest events (currently through Anniversary 26), Icons, and Heroes are kept.

## Setup

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000/players](http://localhost:3000/players). Listing defaults to **newest added first**. On localhost, the first visit each local calendar day silently discovers new sitemap ids at the head of the sitemap (header shows progress; a toast appears when new players were added). Later visits the same day skip discovery. Production on Vercel does not run this — a Windows VPS runs the catalog sync at 21:00 and 23:00 Asia/Ho_Chi_Minh. Copy `.env.example` for Aurora, S3, and the `RENDERZ_*` limiter.

`npm run seed` upserts the public `/players` listing then enriches those ids only. Re-run skips rows already at the current parse version. `--summaries-only` skips detail fetches.

## Daily production catalog

Windows Task Scheduler on the VPS runs `\renderz-daily-catalog` at **21:00 and 23:00 Asia/Ho_Chi_Minh**, whether or not anyone is logged on. The task runs `C:\opt\renderz\bin\daily-catalog.sh` in Git Bash: `git pull`, `npm install`, then `scripts/scheduled-catalog-sync.ts` with `C:\opt\renderz\.env.local` (Aurora and AWS keys). Output is appended to `C:\opt\renderz\daily-catalog.log`. A run that starts while the previous one is still going is skipped. GitHub-hosted runners are not used: Cloudflare returns HTTP 403 to them. Each run reads the sitemap head, refreshes promo cards added in the last 14 days, backfills kept programs (including a new event once one of its cards is stored), then missing base gold/silver. It stops before the job timeout. The next run continues. Cards older than that window stay as stored. The browser loads card art from CloudFront.

## Catalog check

```bash
npm run catalog:verify
```

Prints how many players are stored. It does not delete older players.

## Card text colors

The name, rating, and position colors on a card are RenderZ `animation.colors` (white when absent). The detail parser stores them. To realign every stored card with RenderZ:

```bash
npm run catalog:backfill-colors                  # colors only
npm run catalog:backfill-colors -- --refresh-art # also replace changed background / player art in S3
```

It pages through RenderZ search by asset id (100 cards per request). Base gold/silver cards move to new frames (S11) with new colors, so `--refresh-art` points their `background` / `card` assets at the new images and overwrites the S3 objects. Those objects are cached as immutable, so invalidate `/player-art/*` on CloudFront afterwards.

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
