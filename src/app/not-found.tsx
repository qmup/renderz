import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const copy = messages[await getLocale()];
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.pageNotFound}</h1>
        <p className="text-muted-foreground text-sm">{copy.pageNotFoundBody}</p>
        <Link href="/players" className="text-sm underline-offset-4 hover:underline">
          {copy.backToPlayers}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
