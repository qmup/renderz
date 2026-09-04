# FC Mobile player browser

Personal, read-only Next.js catalog. **The browser never talks to RenderZ** — only this origin (`/players`, `/api/players`, `/api/images/player/:id/:kind`). Public RenderZ HTML is fetched server-side at about one request per second.

This is not a RenderZ client, not a private-API wrapper, and not a UI clone.

## Constraints

- Do not call `api.renderz.app` or `renderz.app/api/*`.
- Do not bypass signed image `verify` params, login, or Cloudflare.
- Domain models (`Player` / `PlayerSummary`) contain **no URLs**. The UI builds image paths from `id` + `kind`.
- On-demand enrichment is **catalog-only**: unknown ids 404.
- Public sitemaps list **10,000** player URLs. RenderZ marketing copy claims 30,000+; treat the sitemap as the discovery set.
- SQLite is a local file (`data/catalog.sqlite`). Fine for personal use; swap the repository if you ever need multiple writers.
- The catalog keeps only cards whose upstream **added** date is within **3 months**. Older rows are removed by `npm run catalog:verify` and skipped during ingest.

## Setup

```bash
npm install
npm run db:migrate
npm run seed          # 50 listing players (~1 req/s)
npm test
npm run dev
```

Open [http://localhost:3000/players](http://localhost:3000/players). Listing defaults to **newest added first**. On localhost, the first visit each local calendar day silently discovers new sitemap ids (header shows progress; a toast appears when new players were added). Later visits the same day skip discovery. Production on Vercel does not run this — use the snapshot pipeline below. Copy `.env.example` to override the SQLite path or `RENDERZ_*` limiter settings.

`npm run seed` upserts the public `/players` listing then enriches those ids only. Re-run skips rows already at the current parse version. `--summaries-only` skips detail fetches. Seed also drops cards older than 3 months.

## Daily production catalog

GitHub Actions workflow `.github/workflows/daily-catalog.yml` runs at **00:00 Asia/Ho_Chi_Minh** (discovery-only, same pipeline as local silent discovery), packs `data/images.sqlite`, and commits `data/catalog.snapshot.sqlite` + images so the next Vercel deploy serves the new snapshot. Manual run: Actions → “Daily catalog update” → Run workflow. Locally: `npm run catalog:daily-update` (add `--skip-images` to skip the image pack). `data/images.sqlite` is stored with Git LFS — enable **Settings → Git → Git LFS** on the Vercel project (and redeploy) or listing cards stay as placeholders.

## Catalog window

```bash
npm run catalog:verify
```

Removes players with `addedAt` older than 3 months, and players with no `addedAt`. Exits `1` if any such row remains. Ingest records those ids as skipped so sitemap sync does not fetch them again.

## Ingest

Discovery enqueue does not fetch player pages:

```bash
npm run ingest sync           # enqueue sitemap ids + stale refreshes
npm run ingest run -- --limit 10
```

Parser v2 stops copying the whole player page into `programName`. Re-run seed or ingest to rebuild old rows. Listing and detail show a **Stale** hint when `parseVersion` is behind or `fetchedAt` is older than 24h. Detail also surfaces upstream 429s (`Retry-After`) without exposing RenderZ URLs.

## Images

Cards load through `GET /api/images/player/:id/:kind` (allowlisted CDN hosts, SSRF controls, placeholder on failure). Signed CDN URLs never reach the browser. Expired signatures trigger a catalog refresh for that id, then one retry.

## Fixtures

Minimized extracted blobs are committed. Full HTML / `__data.json` dumps are gitignored:

```bash
npm run probe:renderz
```

`__data.json` is an optional SvelteKit transport, not a contract. HTML is the durable public page.

## Stack

Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, TanStack Query (listing only), Zod, SQLite + Drizzle (`better-sqlite3`).
