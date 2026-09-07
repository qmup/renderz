import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ingestJobs, playerAssets, players } from '@/db/schema';
import { SEED_PARSE_VERSION } from '@/lib/catalog/parse-version';
import {
  PLAYER_LIST_FACET_FILTER_KEYS,
  buildPlayerListFacets,
  escapeLike,
  foldSearchText,
  normalizePlayerListQuery,
  type PlayerListFacetFilterKey,
} from '@/lib/catalog/query-engine';
import type {
  IngestJob,
  IngestJobKind,
  PlayerCatalog,
  PlayerIndexRow,
  StalePlayerCriteria,
} from '@/lib/catalog/repository';
import {
  createSeedPlayer,
  isPlayerIconImageKind,
  parsePlayerId,
  playerAssetRowSchema,
  playerIdSchema,
  playerSchema,
  toPlayerSummary,
  type Player,
  type PlayerAssetRow,
  type PlayerId,
  type PlayerImageKind,
  type PlayerSeed,
} from '@/lib/domain/player';
import type { PlayerListQuery, PlayerListResult } from '@/lib/domain/query';
import { playerListQuerySchema } from '@/lib/domain/query';
import type * as schema from '@/db/schema';

type Db = BetterSQLite3Database<typeof schema>;

const DEFAULT_LEASE_MS = 5 * 60 * 1000;

const SEARCH_FOLDS: Array<[string, string]> = [
  ['à', 'a'],
  ['á', 'a'],
  ['â', 'a'],
  ['ã', 'a'],
  ['ä', 'a'],
  ['å', 'a'],
  ['è', 'e'],
  ['é', 'e'],
  ['ê', 'e'],
  ['ë', 'e'],
  ['ì', 'i'],
  ['í', 'i'],
  ['î', 'i'],
  ['ï', 'i'],
  ['ò', 'o'],
  ['ó', 'o'],
  ['ô', 'o'],
  ['õ', 'o'],
  ['ö', 'o'],
  ['ù', 'u'],
  ['ú', 'u'],
  ['û', 'u'],
  ['ü', 'u'],
  ['ý', 'y'],
  ['ÿ', 'y'],
  ['ñ', 'n'],
  ['ç', 'c'],
];

function sqlFolded(column: SQL): SQL {
  let expr: SQL = sql`lower(${column})`;
  for (const [from, to] of SEARCH_FOLDS) {
    expr = sql`replace(${expr}, ${from}, ${to})`;
  }
  return expr;
}

function asPlayerId(id: string): PlayerId {
  return parsePlayerId(id);
}

function rowToPlayer(row: typeof players.$inferSelect): Player {
  return playerSchema.parse({
    id: asPlayerId(row.id),
    slug: row.slug,
    name: row.name,
    rating: row.rating,
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    commonName: row.commonName ?? undefined,
    cardName: row.cardName ?? undefined,
    position: row.position ?? undefined,
    altPositions: row.altPositions ?? [],
    programId: row.programId ?? undefined,
    programName: row.programName ?? undefined,
    clubName: row.clubName ?? undefined,
    nationName: row.nationName ?? undefined,
    leagueName: row.leagueName ?? undefined,
    auctionable: row.auctionable ?? undefined,
    foot: row.foot ?? undefined,
    weakFoot: row.weakFoot ?? undefined,
    skillMovesLevel: row.skillMovesLevel ?? undefined,
    heightCm: row.heightCm ?? undefined,
    weightKg: row.weightKg ?? undefined,
    workRateAtt: row.workRateAtt ?? undefined,
    workRateDef: row.workRateDef ?? undefined,
    birthday: row.birthday ?? undefined,
    stats: row.stats ?? [],
    totalStats: row.totalStats ?? undefined,
    metaRating: row.metaRating ?? undefined,
    traits: row.traits ?? [],
    playStyles: row.playStyles ?? [],
    skills: row.skills ?? [],
    relatedCardIds: (row.relatedCardIds ?? []).map((id) => asPlayerId(id)),
    starSigningsBuy: row.starSigningsBuy ?? undefined,
    starSigningsSell: row.starSigningsSell ?? undefined,
    availableImageKinds: row.availableImageKinds ?? [],
    addedAt: row.addedAt ?? undefined,
    fetchedAt: row.fetchedAt,
    parseVersion: row.parseVersion,
  });
}

function playerToRow(
  player: Player,
  discoveredAt: number,
): typeof players.$inferInsert {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    rating: player.rating,
    firstName: player.firstName ?? null,
    lastName: player.lastName ?? null,
    commonName: player.commonName ?? null,
    cardName: player.cardName ?? null,
    position: player.position ?? null,
    altPositions: player.altPositions,
    programId: player.programId ?? null,
    programName: player.programName ?? null,
    clubName: player.clubName ?? null,
    nationName: player.nationName ?? null,
    leagueName: player.leagueName ?? null,
    auctionable: player.auctionable ?? null,
    foot: player.foot ?? null,
    weakFoot: player.weakFoot ?? null,
    skillMovesLevel: player.skillMovesLevel ?? null,
    heightCm: player.heightCm ?? null,
    weightKg: player.weightKg ?? null,
    workRateAtt: player.workRateAtt ?? null,
    workRateDef: player.workRateDef ?? null,
    birthday: player.birthday ?? null,
    stats: player.stats,
    totalStats: player.totalStats ?? null,
    metaRating: player.metaRating ?? null,
    traits: player.traits,
    playStyles: player.playStyles,
    skills: player.skills,
    relatedCardIds: player.relatedCardIds,
    starSigningsBuy: player.starSigningsBuy ?? null,
    starSigningsSell: player.starSigningsSell ?? null,
    availableImageKinds: player.availableImageKinds,
    addedAt: player.addedAt ?? null,
    fetchedAt: player.fetchedAt,
    parseVersion: player.parseVersion,
    discoveredAt,
  };
}

function jobToDomain(row: typeof ingestJobs.$inferSelect): IngestJob {
  return {
    id: row.id,
    playerId: asPlayerId(row.playerId),
    slug: row.slug ?? undefined,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    claimedAt: row.claimedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
  };
}


export class DrizzlePlayerCatalog implements PlayerCatalog {
  constructor(private readonly db: Db) {}

  async exists(id: string): Promise<boolean> {
    const row = this.db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.id, id))
      .get();
    return Boolean(row);
  }

  async isSkipped(id: string): Promise<boolean> {
    const skipped = this.db
      .select({ id: ingestJobs.id })
      .from(ingestJobs)
      .where(and(eq(ingestJobs.playerId, id), eq(ingestJobs.status, 'skipped')))
      .get();
    return Boolean(skipped);
  }

  async listPlayerIndex(): Promise<PlayerIndexRow[]> {
    return this.db
      .select({
        id: players.id,
        slug: players.slug,
        addedAt: players.addedAt,
      })
      .from(players)
      .all()
      .map((row) => ({
        id: asPlayerId(row.id),
        slug: row.slug,
        addedAt: row.addedAt ?? undefined,
      }));
  }

  async deletePlayer(id: string): Promise<void> {
    this.db.delete(playerAssets).where(eq(playerAssets.playerId, id)).run();
    this.db
      .delete(ingestJobs)
      .where(
        and(
          eq(ingestJobs.playerId, id),
          inArray(ingestJobs.status, ['pending', 'failed']),
        ),
      )
      .run();
    this.db.delete(players).where(eq(players.id, id)).run();
  }

  async recordSkipped(
    playerId: string,
    slug?: string,
    reason = 'skipped',
    now = Date.now(),
  ): Promise<void> {
    const id = playerIdSchema.parse(playerId);
    if (await this.isSkipped(id)) {
      return;
    }
    this.db
      .insert(ingestJobs)
      .values({
        playerId: id,
        slug: slug ?? null,
        kind: 'discovery',
        status: 'skipped',
        attempts: 0,
        lastError: reason,
        claimedAt: null,
        completedAt: now,
        nextAttemptAt: now,
        createdAt: now,
      })
      .run();
  }

  async getById(id: string): Promise<Player | null> {
    const row = this.db.select().from(players).where(eq(players.id, id)).get();
    return row ? rowToPlayer(row) : null;
  }

  async list(input: PlayerListQuery): Promise<PlayerListResult> {
    const query = normalizePlayerListQuery(playerListQuerySchema.parse(input));
    const where = this.buildWhere(query);

    const total =
      this.db.select({ n: count() }).from(players).where(where).get()?.n ?? 0;

    const lastPage = Math.max(1, Math.ceil(total / query.pageSize) || 1);
    const page = total === 0 ? 1 : Math.min(query.page, lastPage);
    const offset = (page - 1) * query.pageSize;

    const rows = this.db
      .select()
      .from(players)
      .where(where)
      .orderBy(...sqlOrderBy(query.sort))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const facetSource = this.db
      .select()
      .from(players)
      .where(this.buildWhere(query, new Set(PLAYER_LIST_FACET_FILTER_KEYS)))
      .all();

    return {
      items: rows.map(rowToPlayer).map(toPlayerSummary),
      total,
      page,
      pageSize: query.pageSize,
      facets: buildPlayerListFacets(
        facetSource.map(rowToPlayer).map(toPlayerSummary),
        query,
      ),
    };
  }

  private buildWhere(
    query: PlayerListQuery,
    omit: ReadonlySet<PlayerListFacetFilterKey> = new Set(),
  ): SQL | undefined {
    const parts: SQL[] = [];
    const q = foldSearchText(query.q.trim().replaceAll(/[%_\\]/g, ' '));
    if (q) {
      const pattern = `%${escapeLike(q)}%`;
      const nameMatch = sql`(
        ${sqlFolded(sql`${players.name}`)} like ${pattern}
        or ${sqlFolded(sql`${players.slug}`)} like ${pattern}
        or ${sqlFolded(sql`coalesce(${players.firstName}, '')`)} like ${pattern}
        or ${sqlFolded(sql`coalesce(${players.lastName}, '')`)} like ${pattern}
        or ${sqlFolded(sql`coalesce(${players.commonName}, '')`)} like ${pattern}
        or ${sqlFolded(sql`coalesce(${players.cardName}, '')`)} like ${pattern}
      )`;
      parts.push(nameMatch);
    }

    const { filters } = query;
    if (filters.positions.length > 0 && !omit.has('positions')) {
      const primary = inArray(players.position, filters.positions);
      if (filters.includeAltPositions) {
        const altMatch = sql`exists (
          select 1 from json_each(${players.altPositions})
          where json_each.value in (${sql.join(
            filters.positions.map((position) => sql`${position}`),
            sql`, `,
          )})
        )`;
        parts.push(or(primary, altMatch)!);
      } else {
        parts.push(primary);
      }
    }
    if (filters.programIds.length > 0 && !omit.has('programIds')) {
      parts.push(inArray(players.programId, filters.programIds));
    }
    if (filters.nations.length > 0 && !omit.has('nations')) {
      parts.push(inArray(players.nationName, filters.nations));
    }
    if (filters.clubs.length > 0 && !omit.has('clubs')) {
      parts.push(inArray(players.clubName, filters.clubs));
    }
    if (filters.leagues.length > 0 && !omit.has('leagues')) {
      parts.push(inArray(players.leagueName, filters.leagues));
    }
    if (filters.ratingMin !== undefined) {
      parts.push(gte(players.rating, filters.ratingMin));
    }
    if (filters.ratingMax !== undefined) {
      parts.push(lte(players.rating, filters.ratingMax));
    }
    if (filters.auctionable !== undefined) {
      parts.push(eq(players.auctionable, filters.auctionable));
    }

    if (parts.length === 0) {
      return undefined;
    }
    return and(...parts);
  }

  async upsertDiscovered(seed: PlayerSeed): Promise<void> {
    const now = seed.discoveredAt ?? Date.now();
    const existing = await this.getById(seed.id);
    if (existing) {
      this.db
        .update(players)
        .set({
          slug: seed.slug || existing.slug,
          name: seed.name,
          rating: seed.rating,
        })
        .where(eq(players.id, seed.id))
        .run();
      return;
    }

    const player = createSeedPlayer(seed, now, SEED_PARSE_VERSION);
    this.db.insert(players).values(playerToRow(player, now)).run();
  }

  async upsertPlayer(player: Player, assets: PlayerAssetRow[]): Promise<void> {
    const parsed = playerSchema.parse(player);
    const existing = this.db
      .select({ discoveredAt: players.discoveredAt })
      .from(players)
      .where(eq(players.id, parsed.id))
      .get();
    const discoveredAt = existing?.discoveredAt ?? parsed.fetchedAt;

    this.db
      .insert(players)
      .values(playerToRow(parsed, discoveredAt))
      .onConflictDoUpdate({
        target: players.id,
        set: {
          ...playerToRow(parsed, discoveredAt),
          discoveredAt,
        },
      })
      .run();

    this.db
      .delete(playerAssets)
      .where(eq(playerAssets.playerId, parsed.id))
      .run();
    if (assets.length > 0) {
      this.db
        .insert(playerAssets)
        .values(
          assets.map((asset) => {
            const row = playerAssetRowSchema.parse(asset);
            return {
              playerId: row.playerId,
              kind: row.kind,
              upstreamUrl: row.upstreamUrl,
              fetchedAt: row.fetchedAt,
            };
          }),
        )
        .run();
    }
  }

  async getAsset(
    playerId: string,
    kind: PlayerImageKind,
  ): Promise<PlayerAssetRow | null> {
    const row = this.db
      .select()
      .from(playerAssets)
      .where(
        and(eq(playerAssets.playerId, playerId), eq(playerAssets.kind, kind)),
      )
      .get();
    if (!row) {
      return null;
    }
    return playerAssetRowSchema.parse({
      playerId: asPlayerId(row.playerId),
      kind: row.kind,
      upstreamUrl: row.upstreamUrl,
      fetchedAt: row.fetchedAt,
    });
  }

  async findSharedIconAsset(
    kind: PlayerImageKind,
  ): Promise<PlayerAssetRow | null> {
    if (!isPlayerIconImageKind(kind)) {
      return null;
    }
    const row = this.db
      .select()
      .from(playerAssets)
      .where(eq(playerAssets.kind, kind))
      .orderBy(desc(playerAssets.fetchedAt))
      .get();
    if (!row) {
      return null;
    }
    return playerAssetRowSchema.parse({
      playerId: asPlayerId(row.playerId),
      kind: row.kind,
      upstreamUrl: row.upstreamUrl,
      fetchedAt: row.fetchedAt,
    });
  }

  async enqueueDiscovery(
    playerId: string,
    slug?: string,
    now?: number,
  ): Promise<IngestJob> {
    return this.enqueue(playerId, 'discovery', slug, now);
  }

  async enqueueRefresh(
    playerId: string,
    slug?: string,
    now?: number,
  ): Promise<IngestJob> {
    return this.enqueue(playerId, 'refresh', slug, now);
  }

  async claimNext(
    limit: number,
    now = Date.now(),
    leaseMs = DEFAULT_LEASE_MS,
    kind?: IngestJobKind,
  ): Promise<IngestJob[]> {
    this.db
      .update(ingestJobs)
      .set({
        status: 'pending',
        claimedAt: null,
      })
      .where(
        and(
          eq(ingestJobs.status, 'in_progress'),
          lte(ingestJobs.claimedAt, now - leaseMs),
        ),
      )
      .run();

    const due = this.db
      .select()
      .from(ingestJobs)
      .where(
        and(
          eq(ingestJobs.status, 'pending'),
          lte(ingestJobs.nextAttemptAt, now),
          kind ? eq(ingestJobs.kind, kind) : undefined,
        ),
      )
      .orderBy(asc(ingestJobs.nextAttemptAt), asc(ingestJobs.createdAt))
      .limit(limit)
      .all();

    const claimed: IngestJob[] = [];
    for (const job of due) {
      this.db
        .update(ingestJobs)
        .set({
          status: 'in_progress',
          claimedAt: now,
          attempts: job.attempts + 1,
        })
        .where(eq(ingestJobs.id, job.id))
        .run();
      claimed.push(
        jobToDomain({
          ...job,
          status: 'in_progress',
          claimedAt: now,
          attempts: job.attempts + 1,
        }),
      );
    }
    return claimed;
  }

  async skipOpenDiscoveryJobs(
    reason: string,
    createdAtOnOrBefore: number,
    now = Date.now(),
  ): Promise<number> {
    const result = this.db
      .update(ingestJobs)
      .set({
        status: 'skipped',
        lastError: reason,
        completedAt: now,
        claimedAt: null,
      })
      .where(
        and(
          eq(ingestJobs.kind, 'discovery'),
          inArray(ingestJobs.status, ['pending', 'failed']),
          lte(ingestJobs.createdAt, createdAtOnOrBefore),
        ),
      )
      .run();
    return result.changes;
  }

  async skipDiscoveryJobsByPlayerIds(
    entries: Array<{ id: string; slug?: string }>,
    reason: string,
    now = Date.now(),
  ): Promise<number> {
    const ids = [
      ...new Set(entries.map((entry) => playerIdSchema.parse(entry.id))),
    ];
    if (ids.length === 0) {
      return 0;
    }
    const chunkSize = 400;
    let updated = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const result = this.db
        .update(ingestJobs)
        .set({
          status: 'skipped',
          lastError: reason,
          completedAt: now,
          claimedAt: null,
        })
        .where(
          and(
            eq(ingestJobs.kind, 'discovery'),
            inArray(ingestJobs.status, ['pending', 'failed', 'in_progress']),
            inArray(ingestJobs.playerId, chunk),
          ),
        )
        .run();
      updated += result.changes;
    }
    const slugById = new Map(entries.map((entry) => [entry.id, entry.slug]));
    for (const id of ids) {
      await this.recordSkipped(id, slugById.get(id), reason, now);
    }
    return updated;
  }

  async markSucceeded(jobId: number, now = Date.now()): Promise<void> {
    this.db
      .update(ingestJobs)
      .set({
        status: 'succeeded',
        completedAt: now,
        lastError: null,
      })
      .where(eq(ingestJobs.id, jobId))
      .run();
  }

  async markFailed(
    jobId: number,
    error: string,
    nextAttemptAt: number,
    now = Date.now(),
  ): Promise<void> {
    this.db
      .update(ingestJobs)
      .set({
        status: 'failed',
        lastError: error,
        completedAt: now,
        nextAttemptAt,
        claimedAt: null,
      })
      .where(eq(ingestJobs.id, jobId))
      .run();
  }

  async markRetry(
    jobId: number,
    error: string,
    nextAttemptAt: number,
    now = Date.now(),
  ): Promise<void> {
    this.db
      .update(ingestJobs)
      .set({
        status: 'pending',
        lastError: error,
        nextAttemptAt,
        claimedAt: null,
        completedAt: now,
      })
      .where(eq(ingestJobs.id, jobId))
      .run();
  }

  async listStalePlayerIds(criteria: StalePlayerCriteria): Promise<PlayerId[]> {
    const conditions = [];
    if (criteria.olderThanFetchedAt !== undefined) {
      conditions.push(lte(players.fetchedAt, criteria.olderThanFetchedAt));
    }
    if (criteria.parseVersionBelow !== undefined) {
      conditions.push(lt(players.parseVersion, criteria.parseVersionBelow));
    }
    if (conditions.length === 0) {
      return [];
    }
    const where = conditions.length === 1 ? conditions[0] : or(...conditions);
    const rows = this.db
      .select({ id: players.id })
      .from(players)
      .where(where)
      .all();
    return rows.map((row) => asPlayerId(row.id));
  }

  async countOpenIngestJobs(kind?: IngestJobKind): Promise<number> {
    const row = this.db
      .select({ n: count() })
      .from(ingestJobs)
      .where(
        and(
          inArray(ingestJobs.status, ['pending', 'in_progress']),
          kind ? eq(ingestJobs.kind, kind) : undefined,
        ),
      )
      .get();
    return row?.n ?? 0;
  }

  private enqueue(
    playerId: string,
    kind: IngestJob['kind'],
    slug: string | undefined,
    now = Date.now(),
  ): IngestJob {
    const id = playerIdSchema.parse(playerId);
    if (kind === 'discovery') {
      const skipped = this.db
        .select()
        .from(ingestJobs)
        .where(
          and(eq(ingestJobs.playerId, id), eq(ingestJobs.status, 'skipped')),
        )
        .get();
      if (skipped) {
        return jobToDomain(skipped);
      }
    }
    const existing = this.db
      .select()
      .from(ingestJobs)
      .where(
        and(
          eq(ingestJobs.playerId, id),
          eq(ingestJobs.kind, kind),
          inArray(ingestJobs.status, ['pending', 'in_progress']),
        ),
      )
      .get();
    if (existing) {
      return jobToDomain(existing);
    }

    const inserted = this.db
      .insert(ingestJobs)
      .values({
        playerId: id,
        slug: slug ?? null,
        kind,
        status: 'pending',
        attempts: 0,
        lastError: null,
        claimedAt: null,
        completedAt: null,
        nextAttemptAt: now,
        createdAt: now,
      })
      .returning()
      .get();
    return jobToDomain(inserted);
  }
}

function sqlOrderBy(sort: PlayerListQuery['sort']) {
  switch (sort) {
    case 'rating_asc':
      return [asc(players.rating), asc(players.name), asc(players.id)];
    case 'name_asc':
      return [asc(players.name), asc(players.id)];
    case 'name_desc':
      return [desc(players.name), asc(players.id)];
    case 'added_desc':
      return [
        sql`${players.addedAt} is null`,
        desc(sql`date(${players.addedAt} / 1000, 'unixepoch')`),
        desc(players.rating),
        asc(players.name),
        asc(players.id),
      ];
    case 'fetched_desc':
      return [desc(players.fetchedAt), desc(players.rating), asc(players.id)];
    case 'rating_desc':
      return [desc(players.rating), asc(players.name), asc(players.id)];
    default:
      return [
        sql`${players.addedAt} is null`,
        desc(sql`date(${players.addedAt} / 1000, 'unixepoch')`),
        desc(players.rating),
        asc(players.name),
        asc(players.id),
      ];
  }
}
