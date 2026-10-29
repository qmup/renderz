import type { Metadata } from "next";
import { FollowSyncPanel } from "@/components/players/follow-sync-panel";
import { FollowingBrowser } from "@/components/players/following-browser";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: messages[await getLocale()].followingTitle };
}

export default async function FollowingPage() {
  const copy = messages[await getLocale()];
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:gap-6 sm:py-8">
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-3xl">
          {copy.followingTitle}
        </h1>
        <p className="text-muted-foreground text-sm">{copy.followingSubtitle}</p>
      </div>
      <FollowSyncPanel />
      <FollowingBrowser />
    </main>
  );
}
