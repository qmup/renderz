import { MadeByCredit } from "@/components/made-by-credit";
import { isDev } from "@/lib/dev";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-4 py-6 text-xs">
        {isDev ? (
          <>
            <p>Personal read-only catalog. This browser never requests RenderZ.</p>
            <p>
              Seed with <code className="text-foreground">npm run seed</code>. Refresh
              stale rows with <code className="text-foreground">npm run ingest run</code>.
            </p>
          </>
        ) : null}
        <MadeByCredit />
      </div>
    </footer>
  );
}
