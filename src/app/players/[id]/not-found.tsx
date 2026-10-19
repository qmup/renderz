import Link from "next/link";
import { messages } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";

export default async function PlayerNotFound() {
  const copy = messages[await getLocale()];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {copy.playerMissing}
      </h1>
      <p className="text-muted-foreground text-sm">{copy.playerMissingBody}</p>
      <Link href="/players" className="text-sm underline-offset-4 hover:underline">
        {copy.backToPlayers}
      </Link>
    </main>
  );
}
