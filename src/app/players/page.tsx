import { MadeByCredit } from '@/components/made-by-credit';
import { PlayersBrowser } from "@/components/players/players-browser";
import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { isDev } from "@/lib/dev";
import {
  playerListQueryFromSearchParams,
  playerListQueryToSearchParams,
} from "@/lib/domain/query";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Players",
};

export default async function PlayersPage({ searchParams }: PageProps<"/players">) {
  const raw = await searchParams;
  const query = playerListQueryFromSearchParams(raw);
  const initial = await getPlayerCatalog().list(query);
  const initialSearch = playerListQueryToSearchParams(query).toString();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {isDev ? (
        <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
          Local catalog
        </p>
      ) : null}
      <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight">
        Players
      </h1>
      <MadeByCredit />
      <PlayersBrowser initial={initial} initialSearch={initialSearch} />
    </main>
  );
}
