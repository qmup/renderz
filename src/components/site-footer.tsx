export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs">
        <p>Personal read-only catalog. This browser never requests RenderZ.</p>
        <p>
          Seed with <code className="text-foreground">npm run seed</code>. Refresh
          stale rows with <code className="text-foreground">npm run ingest run</code>.
        </p>
      </div>
    </footer>
  );
}
