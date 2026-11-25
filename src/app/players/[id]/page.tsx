import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogNotice } from '@/components/catalog-notice';
import { PlayerBio } from '@/components/players/player-bio';
import { PlayerFollowButton } from '@/components/players/followed-players';
import { PlayerDetailBack } from '@/components/players/player-detail-back';
import { PlayerDetailInteractive } from '@/components/players/player-detail-interactive';
import {
  PlayerHiddenStats,
  PlayerPlayStyles,
} from '@/components/players/player-icon-lists';
import { StarSigningsPrice } from '@/components/players/star-signings-price';
import { Separator } from '@/components/ui/separator';
import { resolveCardTextColors } from '@/lib/catalog/card-name-color';
import { enrichDiscoveredPlayer } from '@/lib/catalog/enrichment';
import { getPlayerCatalog } from '@/lib/catalog/runtime';
import { isDev } from '@/lib/dev';
import {
  catalogRowNeedsEnrich,
  displayProgramName,
  formatFetchedRelative,
  formatRetryAfter,
  isStaleCatalogRow,
} from '@/lib/display';
import {
  playerIdSchema,
  findCardLoopKind,
  type Player,
} from '@/lib/domain/player';
import {
  loopPublicSrc,
  readLoopPublicFile,
} from '@/lib/catalog/image-cache';
import { imageCdnBase } from '@/lib/images';
import { warmLoopSheet } from '@/lib/catalog/warm-loop';
import { messages } from '@/lib/i18n/messages';
import { getLocale } from '@/lib/i18n/server';
import { RateLimitedError } from '@/lib/http/errors';
import { getRenderzSource } from '@/lib/providers/renderz/renderz-source';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type EnrichNotice = 'rate_limited' | 'enrich_failed';

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
        notice: 'rate_limited',
        retryAfterMs: error.retryAfterMs,
      };
    }
    return { player: existing, notice: 'enrich_failed' };
  }
}

export async function generateMetadata({
  params,
}: PageProps<'/players/[id]'>): Promise<Metadata> {
  const { id: rawId } = await params;
  const parsed = playerIdSchema.safeParse(rawId);
  const copy = messages[await getLocale()];
  if (!parsed.success) {
    return { title: copy.playerFallback };
  }
  const player = await getPlayerCatalog().getById(parsed.data);
  return { title: player?.name ?? copy.playerFallback };
}

export default async function PlayerDetailPage({
  params,
}: PageProps<'/players/[id]'>) {
  const locale = await getLocale();
  const copy = messages[locale];
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
  const program = displayProgramName(player.programName, player.programId);
  const loopKind = findCardLoopKind(player.availableImageKinds);
  const catalog = getPlayerCatalog();
  const [loopAsset, backgroundAsset] = await Promise.all([
    loopKind ? catalog.getAsset(player.id, loopKind) : Promise.resolve(null),
    catalog.getAsset(player.id, 'background'),
  ]);
  const overlayColors = resolveCardTextColors({
    name: player.nameColor,
    rating: player.ratingColor,
    position: player.positionColor,
    backgroundAssetUrl: backgroundAsset?.upstreamUrl,
  });
  // Prefer static CDN /loops; when a brand-new sheet is not packed yet, warm
  // the serverless image cache so CardLoopCanvas can animate via the API.
  const packedLoop =
    loopAsset && readLoopPublicFile(loopAsset.upstreamUrl)
      ? loopPublicSrc(loopAsset.upstreamUrl)
      : undefined;
  // On Vercel the sheet is on the image CDN, not on the function disk.
  const loopSrc =
    packedLoop ??
    (loopAsset && imageCdnBase()
      ? loopPublicSrc(loopAsset.upstreamUrl)
      : undefined);
  if (loopKind && loopAsset && !loopSrc) {
    await warmLoopSheet(catalog, player.id, loopKind, loopAsset);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:gap-8 sm:py-8">
      <PlayerDetailBack />

      {notice === 'rate_limited' ? (
        <CatalogNotice title={copy.rateLimitedTitle} tone="warning">
          {copy.rateLimitedBefore} {formatRetryAfter(retryAfterMs, locale)}.{" "}
          {copy.rateLimitedAfter}
        </CatalogNotice>
      ) : null}
      {notice === 'enrich_failed' ? (
        <CatalogNotice title={copy.enrichFailedTitle} tone="warning">
          {copy.enrichFailedBefore}{" "}
          <code className="text-foreground">npm run ingest run</code>
          {copy.enrichFailedAfter}
        </CatalogNotice>
      ) : null}
      {notice === undefined && stale ? (
        <CatalogNotice title={copy.staleTitle} tone="info">
          {copy.staleBody(
            formatFetchedRelative(player.fetchedAt, locale),
            player.parseVersion,
          )}
        </CatalogNotice>
      ) : null}

      <PlayerDetailInteractive
        player={player}
        program={program}
        overlayColors={overlayColors}
        loopSrc={loopSrc}
        priceSlot={
          <StarSigningsPrice
            playerId={player.id}
            buy={player.starSigningsBuy}
            sell={player.starSigningsSell}
          />
        }
        playStylesSlot={
          <PlayerPlayStyles
            playerId={player.id}
            styles={player.playStyles}
            compact
          />
        }
        bioSlot={<PlayerBio player={player} />}
        hiddenStatsSlot={
          <PlayerHiddenStats playerId={player.id} traits={player.traits} />
        }
      />

      {isDev ? (
        <>
          <Separator />
          <p className="text-muted-foreground text-xs">
            {copy.devParserNote(player.parseVersion)}
          </p>
        </>
      ) : null}
      <PlayerFollowButton playerId={player.id} />
    </main>
  );
}
