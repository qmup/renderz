import Link from "next/link";
import { headers } from "next/headers";
import { CatalogUpdateControl } from "@/components/catalog-update-control";
import {
  hostnameFromHostHeader,
  isLocalhostHostname,
} from "@/lib/http/localhost";

export async function SiteHeader() {
  const host = (await headers()).get("host") ?? "";
  const showCatalogUpdate = isLocalhostHostname(hostnameFromHostHeader(host));

  return (
    <header className="border-b border-border bg-background/90 sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-14 sm:gap-3">
        <Link href="/players" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="bg-primary h-5 w-1 shrink-0 rounded-full" aria-hidden />
          <span className="font-heading truncate text-sm font-semibold tracking-tight">
            FC Mobile catalog
          </span>
        </Link>
        {showCatalogUpdate ? <CatalogUpdateControl /> : null}
      </div>
    </header>
  );
}
