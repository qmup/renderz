import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import { isDev } from "@/lib/dev";

export async function SiteFooter() {
  const copy = messages[await getLocale()];
  return (
    <footer className="border-t border-border">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-4 py-6 text-xs">
        {isDev ? (
          <>
            <p>{copy.footerReadOnly}</p>
            <p>
              {copy.footerSeedBefore}{" "}
              <code className="text-foreground">npm run seed</code>
              {copy.footerSeedMiddle}{" "}
              <code className="text-foreground">npm run ingest run</code>
              {copy.footerSeedAfter}
            </p>
          </>
        ) : null}
      </div>
    </footer>
  );
}
