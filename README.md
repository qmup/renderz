# FC Mobile player browser

Personal read-only Next.js app. The browser talks only to this origin. RenderZ public pages are fetched server-side.

## M0 / M1 / M2

SQLite catalog via Drizzle + `better-sqlite3`. Domain models, repository, query engine, ingest job table, RenderZ HTML/`__data.json` parsers, and an opaque image proxy exist. The interactive listing UI ships in M3.

```bash
npm install
npm run db:migrate
npm run typecheck
npm run lint
npm test
npm run dev
```

To refresh gitignored raw RenderZ fixtures locally:

```bash
npm run probe:renderz
```

SQLite file: `data/catalog.sqlite` (gitignored). Copy `.env.example` if you need to override paths or upstream limiter settings.
