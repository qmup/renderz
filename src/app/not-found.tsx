import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          That route is not part of this catalog.
        </p>
        <Link href="/players" className="text-sm underline-offset-4 hover:underline">
          Back to players
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
