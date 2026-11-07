# FC Mobile player browser

Personal, read-only Next.js catalog. **The browser never talks to RenderZ** — only this origin (`/players`, `/api/players`, `/api/images/player/:id/:kind`). Public RenderZ HTML is fetched server-side at about one request per second.

This is not a RenderZ client, not a private-API wrapper, and not a UI clone.

## Constraints

- Do not call `api.renderz.app` or `renderz.app/api/*`.
- Do not bypass signed image `verify` params, login, or Cloudflare.
- Domain models (`Player` / `PlayerSummary`) contain **no URLs**. The UI builds image paths from `id` + `kind`.
- On-demand enrichment is **catalog-only**: unknown ids 404.
- Public sitemaps list **10,000** player URLs. RenderZ marketing copy claims 30,000+; treat the sitemap as the discovery set.
- The catalog is Neon Postgres (Vercel Marketplace). Card art and LOOP sheets are in a Cloudflare R2 bucket, served from its public `r2.dev` URL.
- The catalog keeps players it has already stored. Sync adds missing cards and refreshes promo cards from the last 14 days. Older seasons on renderz.app/programs are skipped; the newest events (currently through Anniversary 26), Icons, and Heroes are kept.

## Setup

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000/players](http://localhost:3000/players). Listing defaults to **newest added first**. On localhost, the first visit each local calendar day silently discovers new sitemap ids at the head of the sitemap (header shows progress; a toast appears when new players were added). Later visits the same day skip discovery. Production on Vercel does not run this; the production catalog is synced by hand (see below). Run `vercel env pull` (or copy `.env.example`) for `DATABASE_URL`, the R2 `S3_*` keys, and the `RENDERZ_*` limiter.

`npm run seed` upserts the public `/players` listing then enriches those ids only. Re-run skips rows already at the current parse version. `--summaries-only` skips detail fetches.

## Production catalog sync

There is no scheduler. Run the sync by hand from a machine on a residential connection, with `.env.local` holding `DATABASE_URL` and the R2 `S3_*` keys:

```bash
npm run catalog:sync
```

The Mac stays awake for the run (`caffeinate`). Output is also written to `logs/catalog-sync-<date>.log`. Afterwards it marks the production `player-list` cache stale (`vercel cache invalidate`), so the Vercel CLI must be logged in and this folder linked to the `fcvn` project. Without that, listing pages and filters keep the old catalog until the cache expires.

Cloudflare returns HTTP 403 to datacenter IPs, including GitHub-hosted runners and Vercel (Functions, Cron, Sandbox), so the sync cannot run there. Each run reads the sitemap head, refreshes promo cards added in the last 14 days, backfills kept programs (including a new event once one of its cards is stored), then missing base gold/silver. It stops before the job timeout. The next run continues. Cards older than that window stay as stored. The browser loads card art from R2.

## Catalog check

```bash
npm run catalog:verify
```

Prints how many players are stored. It does not delete older players.

## Card text colors

The name, rating, and position colors on a card are RenderZ `animation.colors` (white when absent). The detail parser stores them. To realign every stored card with RenderZ:

```bash
npm run catalog:backfill-colors                  # colors only
npm run catalog:backfill-colors -- --refresh-art # also replace changed background / player art in R2
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

Listing card art is served from R2 (`/player-art/...`). The UI falls back to `GET /api/images/player/:id/:kind` (allowlisted CDN hosts, SSRF controls, placeholder on failure). Signed CDN URLs never reach the browser. Expired signatures trigger a catalog refresh for that id, then one retry.

## Fixtures

Minimized extracted blobs are committed. Full HTML / `__data.json` dumps are gitignored:

```bash
npm run probe:renderz
```

`__data.json` is an optional SvelteKit transport, not a contract. HTML is the durable public page.

## Stack

Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Query (listing only), Zod, Neon Postgres + Drizzle.
