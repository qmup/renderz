# FC Mobile player browser

Personal read-only Next.js app. The browser talks only to this origin; RenderZ is accessed server-side later (M2).

## M0 / M1

SQLite catalog via Drizzle + `better-sqlite3`. Domain models, repository, query engine, ingest job table, and health/list APIs exist. Player-page parsing is not implemented yet.

```bash
npm install
npm run db:migrate
npm run typecheck
npm run lint
npm test
npm run dev
```

SQLite file: `data/catalog.sqlite` (gitignored). Copy `.env.example` if you need to override paths or upstream limiter settings.
