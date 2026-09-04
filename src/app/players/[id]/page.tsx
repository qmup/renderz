import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogNotice } from "@/components/catalog-notice";
import { PlayerBio } from "@/components/players/player-bio";
import { PlayerCardArt } from "@/components/players/player-card-art";
import { PlayerDetailStats } from "@/components/players/player-detail-stats";
import {
  PlayerHiddenStats,
  PlayerPlayStyles,
} from "@/components/players/player-icon-lists";
import { StarSigningsPrice } from "@/components/players/star-signings-price";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { enrichDiscoveredPlayer } from "@/lib/catalog/enrichment";
import { getPlayerCatalog } from "@/lib/catalog/runtime";
import { isDev } from "@/lib/dev";
import {
  catalogRowNeedsEnrich,
  displayProgramName,
  formatFetchedRelative,
  formatRetryAfter,
  isStaleCatalogRow,
} from "@/lib/display";
import { playerIdSchema, cardDisplayName, type Player } from "@/lib/domain/player";
import { RateLimitedError } from "@/lib/http/errors";
import { getRenderzSource } from "@/lib/providers/renderz/renderz-source";
import { groupDetailStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EnrichNotice = "rate_limited" | "enrich_failed";

type PlayerLoad = {
  player: Player;
  notice?: EnrichNotice;
  retryAfterMs?: number;
};

async function loadPlayer(id: string): Promise<PlayerLoad | null> {
  const catalog = getPlayerCatalog();
  if (!(await catalog.exists(id))) {
    return null;
  }
  const existing = await catalog.getById(id);
  if (!existing) {
    return null;
  }
  if (!catalogRowNeedsEnrich(existing)) {
    return { player: existing };
  }
  try {
    const player = await enrichDiscoveredPlayer(
      catalog,
      getRenderzSource(),
      id,
    );
    return { player };
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return {
        player: existing,
        notice: "rate_limited",
        retryAfterMs: error.retryAfterMs,
      };
    }
    return { player: existing, notice: "enrich_failed" };
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/players/[id]">): Promise<Metadata> {
  const { id: rawId } = await params;
  const parsed = playerIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return { title: "Player" };
  }
  const player = await getPlayerCatalog().getById(parsed.data);
  return { title: player?.name ?? "Player" };
}

export default async function PlayerDetailPage({
  params,
}: PageProps<"/players/[id]">) {
  const { id: rawId } = await params;
  const parsed = playerIdSchema.safeParse(rawId);
  if (!parsed.success) {
    notFound();
  }
  const loaded = await loadPlayer(parsed.data);
  if (!loaded) {
    notFound();
  }

  const { player, notice, retryAfterMs } = loaded;
  const stale = isStaleCatalogRow(player);
  const groupedStats = groupDetailStats(player.stats);
  const program = displayProgramName(player.programName, player.programId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:py-8">
      <p className="text-muted-foreground text-sm">
        <Link href="/players" className="hover:text-foreground -mx-1 inline-flex min-h-10 items-center px-1 underline-offset-4 hover:underline">
          Players
        </Link>
      </p>

      {notice === "rate_limited" ? (
        <CatalogNotice title="Refresh paused by the upstream rate limit" tone="warning">
          Showing the last catalog copy. Try again in {formatRetryAfter(retryAfterMs)}.
          Ingest uses about one request per second.
        </CatalogNotice>
      ) : null}
      {notice === "enrich_failed" ? (
        <CatalogNotice title="Could not refresh this player" tone="warning">
          Showing the last catalog copy. Parser or upstream fetch failed; retry later
          or run <code className="text-foreground">npm run ingest run</code>.
        </CatalogNotice>
      ) : null}
      {notice === undefined && stale ? (
        <CatalogNotice title="This row looks stale" tone="info">
          Fetched {formatFetchedRelative(player.fetchedAt)} · parser v
          {player.parseVersion}. Refresh with ingest when the queue is free.
        </CatalogNotice>
      ) : null}

      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <div className="flex w-full shrink-0 flex-col items-center sm:w-auto">
          <PlayerCardArt
            id={player.id}
            kinds={player.availableImageKinds}
            rating={player.rating}
            position={player.position}
            auctionable={player.auctionable}
            displayName={cardDisplayName(player)}
            playStyles={player.playStyles}
            size={208}
            priority
          />
          <StarSigningsPrice
            buy={player.starSigningsBuy}
            sell={player.starSigningsSell}
          />
        </div>
        <div className="flex min-w-0 w-full flex-col gap-3">
          <div>
            <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
              {program ?? "FC Mobile"}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {player.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="font-heading text-3xl tabular-nums sm:text-4xl">{player.rating}</span>
            {player.position ? <Badge>{player.position}</Badge> : null}
            {player.altPositions.map((position) => (
              <Badge key={position} variant="secondary">
                {position}
              </Badge>
            ))}
            {player.auctionable === true ? (
              <Badge variant="outline">Auctionable</Badge>
            ) : player.auctionable === false ? (
              <Badge variant="outline">Untradeable</Badge>
            ) : null}
          </div>
          <PlayerPlayStyles
            playerId={player.id}
            styles={player.playStyles}
            compact
          />
        </div>
      </header>

      <PlayerBio player={player} />
      <PlayerHiddenStats playerId={player.id} traits={player.traits} />

      {groupedStats.length > 0 ? (
        <PlayerDetailStats stats={player.stats} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Detailed stats are not in the catalog yet for this player.
        </p>
      )}

      {isDev ? (
        <>
          <Separator />
          <p className="text-muted-foreground text-xs">
            Parser v{player.parseVersion}. Detail stats use full group names
            (Pace, Shooting, …). Playstyle and hidden-stat labels come from the
            public RenderZ player page.
          </p>
        </>
      ) : null}
    </main>
  );
}
