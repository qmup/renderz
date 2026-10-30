/**
 * Align stored card text colors (and, with --refresh-art, card art) with
 * RenderZ.
 *
 * 1. Page through RenderZ search by asset id (100 cards per request) and
 *    store `animation.colors` for every catalog card.
 * 2. Cards whose upstream background or player image changed since ingest
 *    (base gold/silver moved to the S11 frames) are listed. With
 *    --refresh-art their `background` / `card` assets point at the new
 *    images and the S3 objects are replaced. CloudFront still needs an
 *    invalidation for the printed paths.
 * 3. Cards search did not return get colors from their detail page.
 *
 *   npm run catalog:backfill-colors
 *   npm run catalog:backfill-colors -- --refresh-art
 */
import { S3Client } from "@aws-sdk/client-s3";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getPostgresDb } from "../src/db/postgres";
import { playerAssets, players } from "../src/db/postgres-schema";
import {
  CARD_NAME_WHITE,
  type CardTextColors,
} from "../src/lib/catalog/card-name-color";
import { catalogObjectKey, planCatalogUploads } from "../src/lib/catalog/object-keys";
import { uploadCatalogObjects } from "../src/lib/catalog/s3-uploads";
import {
  searchCardsAfter,
  upstreamImageName,
  type SearchCardArt,
} from "../src/lib/providers/renderz/base-card-search";
import { RenderzClient } from "../src/lib/providers/renderz/client";
import { parsePlayerPage } from "../src/lib/providers/renderz/player-parser";
import { playerUrl } from "../src/lib/providers/renderz/urls";

const ART_UPLOAD_SLICE = 100;

const db = getPostgresDb();
const client = new RenderzClient();

type StoredCard = { slug: string; background?: string; card?: string };
type ArtKind = "background" | "card";
type ArtChange = { id: string; kind: ArtKind; upstreamUrl: string };

async function writeColors(
  rows: ReadonlyArray<{ id: string; colors: CardTextColors }>,
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const values = sql.join(
    rows.map(
      (row) =>
        sql`(${row.id}, ${row.colors.name}, ${row.colors.rating}, ${row.colors.position})`,
    ),
    sql`, `,
  );
  const result = await db.execute(sql`
    update players as p
    set name_color = v.name, rating_color = v.rating, position_color = v.position
    from (values ${values}) as v(id, name, rating, position)
    where p.id = v.id
      and (p.name_color is distinct from v.name
        or p.rating_color is distinct from v.rating
        or p.position_color is distinct from v.position)
  `);
  return result.rowCount ?? 0;
}

async function loadStoredCards(): Promise<Map<string, StoredCard>> {
  const rows = await db.select({ id: players.id, slug: players.slug }).from(players);
  const stored = new Map<string, StoredCard>(
    rows.map((row) => [row.id, { slug: row.slug }]),
  );
  const art = await db
    .select({
      playerId: playerAssets.playerId,
      kind: playerAssets.kind,
      upstreamUrl: playerAssets.upstreamUrl,
    })
    .from(playerAssets)
    .where(inArray(playerAssets.kind, ["background", "card"]));
  for (const row of art) {
    const card = stored.get(row.playerId);
    if (!card) {
      continue;
    }
    const name = upstreamImageName(row.upstreamUrl);
    if (row.kind === "background") {
      card.background = name;
    } else {
      card.card = name;
    }
  }
  return stored;
}

function artChanges(card: SearchCardArt, before: StoredCard): ArtChange[] {
  const changes: ArtChange[] = [];
  if (card.backgroundUrl && before.background && card.background !== before.background) {
    changes.push({ id: card.id, kind: "background", upstreamUrl: card.backgroundUrl });
  }
  if (card.cardUrl && before.card && card.card !== before.card) {
    changes.push({ id: card.id, kind: "card", upstreamUrl: card.cardUrl });
  }
  return changes;
}

async function backfillFromSearch(stored: Map<string, StoredCard>): Promise<ArtChange[]> {
  const changes: ArtChange[] = [];
  let afterId = 0;
  let seen = 0;
  let updated = 0;
  for (let page = 1; ; page++) {
    const cards = await searchCardsAfter(afterId, client);
    if (cards.length === 0) {
      break;
    }
    afterId = Number(cards.at(-1)!.id);
    const ours = cards.filter((card) => stored.has(card.id));
    seen += ours.length;
    updated += await writeColors(ours);
    for (const card of ours) {
      changes.push(...artChanges(card, stored.get(card.id)!));
    }
    if (page % 25 === 0) {
      console.log(
        `search page=${page} afterId=${afterId} catalogCards=${seen} colorsUpdated=${updated} artChanges=${changes.length}`,
      );
    }
  }
  console.log(
    `search done catalogCards=${seen}/${stored.size} colorsUpdated=${updated} artChanges=${changes.length}`,
  );
  return changes;
}

async function refreshArt(changes: readonly ArtChange[]): Promise<void> {
  const bucket = process.env.S3_BUCKET?.trim() || "renderz-bucket";
  const region = process.env.AWS_REGION?.trim() || "ap-southeast-1";
  const s3 = new S3Client({ region });
  let failed = 0;
  for (let start = 0; start < changes.length; start += ART_UPLOAD_SLICE) {
    const slice = changes.slice(start, start + ART_UPLOAD_SLICE);
    const now = Date.now();
    for (const change of slice) {
      await db
        .update(playerAssets)
        .set({ upstreamUrl: change.upstreamUrl, fetchedAt: now })
        .where(
          and(eq(playerAssets.playerId, change.id), eq(playerAssets.kind, change.kind)),
        );
    }
    const jobs = planCatalogUploads(
      slice.map((change) => ({
        playerId: change.id,
        kind: change.kind,
        upstreamUrl: change.upstreamUrl,
        fetchedAt: now,
        required: true,
        replace: true,
      })),
    );
    failed += (await uploadCatalogObjects(s3, bucket, jobs)).failed;
    console.log(`art ${Math.min(start + slice.length, changes.length)}/${changes.length} failed=${failed}`);
  }
  const paths = changes.flatMap((change) => {
    const key = catalogObjectKey(change.id, change.kind, change.upstreamUrl);
    return key ? [`/${key}`] : [];
  });
  console.log(`art done changes=${changes.length} failed=${failed} invalidate=${paths.length}`);
}

async function backfillFromDetails(stored: Map<string, StoredCard>): Promise<void> {
  const pending = await db
    .select({ id: players.id })
    .from(players)
    .where(isNull(players.nameColor));
  console.log(`details pending=${pending.length}`);
  let updated = 0;
  let failed = 0;
  for (const row of pending) {
    try {
      const html = await client.getText(playerUrl(row.id, stored.get(row.id)?.slug || undefined));
      const { player } = parsePlayerPage({ html });
      updated += await writeColors([
        {
          id: row.id,
          colors: {
            name: player.nameColor ?? CARD_NAME_WHITE,
            rating: player.ratingColor ?? CARD_NAME_WHITE,
            position: player.positionColor ?? CARD_NAME_WHITE,
          },
        },
      ]);
    } catch (error) {
      failed += 1;
      console.warn(`details id=${row.id} failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`details done updated=${updated} failed=${failed}`);
}

async function main() {
  const stored = await loadStoredCards();
  const changes = await backfillFromSearch(stored);
  if (process.argv.includes("--refresh-art")) {
    await refreshArt(changes);
  } else if (changes.length > 0) {
    console.log(`art changes waiting for --refresh-art: ${changes.length}`);
  }
  await backfillFromDetails(stored);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
