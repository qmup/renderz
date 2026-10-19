import Link from "next/link";
import { headers } from "next/headers";
import { CatalogUpdateControl } from "@/components/catalog-update-control";
import { HeaderControls } from "@/components/header-controls";
import { FollowNavLink } from "@/components/players/followed-players";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import {
  hostnameFromHostHeader,
  isLocalhostHostname,
} from "@/lib/http/localhost";

export async function SiteHeader() {
  const host = (await headers()).get("host") ?? "";
  const showCatalogUpdate = isLocalhostHostname(hostnameFromHostHeader(host));
  const copy = messages[await getLocale()];

  return (
    <header className="relative z-30 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-14">
        <Link href="/players" className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary h-5 w-1 shrink-0 rounded-full" aria-hidden />
          <span className="font-heading truncate text-sm font-semibold tracking-tight">
            {copy.brand}
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <HeaderControls />
          <FollowNavLink />
          {showCatalogUpdate ? <CatalogUpdateControl /> : null}
        </div>
      </div>
    </header>
  );
}
