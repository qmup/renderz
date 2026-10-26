import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AuroraDatabase } from "@/db/postgres";
import { ingestJobs, playerAssets, players } from "@/db/postgres-schema";
import { applyCardNameColors } from "@/lib/catalog/card-name-color";
import {
  clearPlayerListCache,
  readFacetResult,
  readPlayerListCache,
  writeFacetResult,
  writePlayerListCache,
} from "@/lib/catalog/list-cache";

export { clearPlayerListCache };
import { SEED_PARSE_VERSION } from "@/lib/catalog/parse-version";
import {
  escapeLike,
  facetValuesFromCounts,
  normalizePlayerListQuery,
  playerSearchNeedle,
  type PlayerListFacetFilterKey,
} from "@/lib/catalog/query-engine";
import type {
  IngestJob,
  IngestJobKind,
  PlayerCatalog,
  PlayerIndexRow,
  StalePlayerCriteria,
} from "@/lib/catalog/repository";
import {
  createSeedPlayer,
  isPlayerIconImageKind,
  parsePlayerId,
  playerAssetRowSchema,
  playerIdSchema,
  playerSchema,
  playerSummarySchema,
  sortPlayStylesByLevelDesc,
  toPlayerSummary,
  uniquePlayerIds,
  type Player,
  type PlayerAssetRow,
  type PlayerId,
  type PlayerImageKind,
  type PlayerSeed,
  type PlayerSummary,
} from "@/lib/domain/player";
import type {
  PlayerListFacets,
  PlayerListQuery,
  PlayerListResult,
} from "@/lib/domain/query";
import {
  playerListQuerySchema,
  playerListQueryToSearchParams,
} from "@/lib/domain/query";
import { groupStatsFromPlayerStats } from "@/lib/stats";

const DEFAULT_LEASE_MS = 5 * 60 * 1000;

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
    nameColor: row.nameColor ?? undefined,
    ratingColor: row.ratingColor ?? undefined,
    positionColor: row.positionColor ?? undefined,
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
    nameColor: player.nameColor ?? null,
    ratingColor: player.ratingColor ?? null,
    positionColor: player.positionColor ?? null,
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

function facetCacheKey(query: PlayerListQuery): string {
  return playerListQueryToSearchParams({
    ...query,
    page: 1,
    pageSize: 24,
    sort: "added_desc",
    view: "list",
  }).toString();
}

function summaryFromListRow(raw: Record<string, unknown>): PlayerSummary {
  const text = (value: unknown): string | undefined => {
    if (value == null) {
      return undefined;
    }
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
  };
  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
  const stats = list(raw.stats).flatMap((stat) => {
    if (!stat || typeof stat !== "object") {
      return [];
    }
    const record = stat as { key?: unknown; value?: unknown; label?: unknown };
    if (typeof record.key !== "string" || typeof record.value !== "number") {
      return [];
    }
    return [
      {
        key: record.key,
        value: record.value,
        label: typeof record.label === "string" ? record.label : undefined,
      },
    ];
  });
  const playStyles = list(raw.play_styles).flatMap((style) => {
    if (!style || typeof style !== "object") {
      return [];
    }
    const record = style as { id?: unknown; level?: unknown };
    if (typeof record.id !== "string" || record.id.length === 0) {
      return [];
    }
    return [
      {
        id: record.id,
        level: typeof record.level === "number" ? record.level : undefined,
      },
    ];
  });
  return playerSummarySchema.parse({
    id: String(raw.id),
    slug: String(raw.slug ?? ""),
    name: String(raw.name),
    cardName: text(raw.card_name),
    lastName: text(raw.last_name),
    commonName: text(raw.common_name),
    rating: Number(raw.rating),
    position: text(raw.position),
    programId: text(raw.program_id),
    clubName: text(raw.club_name),
    nationName: text(raw.nation_name),
    leagueName: text(raw.league_name),
    auctionable: raw.auctionable == null ? undefined : Boolean(raw.auctionable),
    altPositions: list(raw.alt_positions).filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
    avgStats: groupStatsFromPlayerStats(stats),
    playStyles: sortPlayStylesByLevelDesc(playStyles),
    availableImageKinds: list(raw.available_image_kinds),
    nameColor: text(raw.name_color),
    ratingColor: text(raw.rating_color),
    positionColor: text(raw.position_color),
    addedAt: raw.added_at == null ? undefined : Number(raw.added_at),
    fetchedAt: Number(raw.fetched_at),
    parseVersion: Number(raw.parse_version),
  });
}

function sqlOrderBy(sort: PlayerListQuery["sort"]) {
  switch (sort) {
    case "rating_asc":
      return [asc(players.rating), asc(players.name), asc(players.id)];
    case "name_asc":
      return [asc(players.name), asc(players.id)];
    case "name_desc":
      return [desc(players.name), asc(players.id)];
    case "fetched_desc":
      return [desc(players.fetchedAt), desc(players.rating), asc(players.id)];
    case "rating_desc":
      return [desc(players.rating), asc(players.name), asc(players.id)];
    case "added_desc":
    default:
      return [
        sql`${players.addedAt} desc nulls last`,
        desc(players.rating),
        asc(players.name),
        asc(players.id),
      ];
  }
}

export class PostgresPlayerCatalog implements PlayerCatalog {
  constructor(private readonly db: AuroraDatabase) {}

  async exists(id: string): Promise<boolean> {
    const row = await this.db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.id, id))
      .limit(1);
    return Boolean(row[0]);
  }

  async isSkipped(id: string): Promise<boolean> {
    const skipped = await this.db
      .select({ id: ingestJobs.id })
      .from(ingestJobs)
      .where(and(eq(ingestJobs.playerId, id), eq(ingestJobs.status, "skipped")))
      .limit(1);
    return Boolean(skipped[0]);
  }

  async listPlayerIndex(): Promise<PlayerIndexRow[]> {
    const rows = await this.db
      .select({
        id: players.id,
        slug: players.slug,
        addedAt: players.addedAt,
        programId: players.programId,
      })
      .from(players);
    return rows.map((row) => ({
      id: asPlayerId(row.id),
      slug: row.slug,
      addedAt: row.addedAt ?? undefined,
      programId: row.programId ?? undefined,
    }));
  }

  async deletePlayer(id: string): Promise<void> {
    clearPlayerListCache();
    await this.db.delete(playerAssets).where(eq(playerAssets.playerId, id));
    await this.db
      .delete(ingestJobs)
      .where(
        and(
          eq(ingestJobs.playerId, id),
          inArray(ingestJobs.status, ["pending", "failed"]),
        ),
      );
    await this.db.delete(players).where(eq(players.id, id));
  }

  async recordSkipped(
    playerId: string,
    slug?: string,
    reason = "skipped",
    now = Date.now(),
  ): Promise<void> {
    const id = playerIdSchema.parse(playerId);
    if (await this.isSkipped(id)) {
      return;
    }
    await this.db.insert(ingestJobs).values({
      playerId: id,
      slug: slug ?? null,
      kind: "discovery",
      status: "skipped",
      attempts: 0,
      lastError: reason,
      claimedAt: null,
      completedAt: now,
      nextAttemptAt: now,
      createdAt: now,
    });
  }

  async getById(id: string): Promise<Player | null> {
    const rows = await this.db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);
    return rows[0] ? rowToPlayer(rows[0]) : null;
  }

  async listByIds(ids: readonly string[]): Promise<PlayerSummary[]> {
    const unique = uniquePlayerIds(ids);
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(players)
      .where(inArray(players.id, unique));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const summaries = unique.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toPlayerSummary(rowToPlayer(row))] : [];
    });
    return applyCardNameColors(
      summaries,
      await this.backgroundUrlByPlayerId(summaries.map((item) => item.id)),
    );
  }

  async list(input: PlayerListQuery): Promise<PlayerListResult> {
    const query = normalizePlayerListQuery(playerListQuerySchema.parse(input));
    const cacheKey = playerListQueryToSearchParams(query).toString();
    const cached = readPlayerListCache(cacheKey);
    if (cached) {
      return cached;
    }
    const page = await this.loadPage(query);
    const facets = await this.loadFacets(query);
    const result: PlayerListResult = {
      items: applyCardNameColors(page.rows.map(summaryFromListRow), page.backgrounds),
      total: page.total,
      page: page.page,
      pageSize: query.pageSize,
      facets,
    };
    writePlayerListCache(cacheKey, result);
    return result;
  }

  /**
   * Page rows use the added-at index and return summary columns only.
   * Facets come from a cached narrow snapshot, not five grouped scans.
   */
  private async loadPage(query: PlayerListQuery): Promise<{
    rows: Array<Record<string, unknown>>;
    total: number;
    page: number;
    backgrounds: Map<string, string>;
  }> {
    const where = this.buildWhere(query) ?? sql`true`;
    const order = sql.join(sqlOrderBy(query.sort), sql`, `);
    const counted = await this.db.execute<{ total: number }>(sql`
      select count(*)::int as total
      from ${players}
      where ${where}
    `);
    const total = Number(counted.rows[0]?.total ?? 0);
    const pageCount = Math.max(1, Math.ceil(total / query.pageSize) || 1);
    const page = total === 0 ? 1 : Math.min(query.page, pageCount);
    const offset = (page - 1) * query.pageSize;
    const selected = await this.db.execute<Record<string, unknown>>(sql`
      select
        ${players.id} as id,
        ${players.slug} as slug,
        ${players.name} as name,
        ${players.rating} as rating,
        ${players.cardName} as card_name,
        ${players.lastName} as last_name,
        ${players.commonName} as common_name,
        ${players.position} as position,
        ${players.programId} as program_id,
        ${players.clubName} as club_name,
        ${players.nationName} as nation_name,
        ${players.leagueName} as league_name,
        ${players.auctionable} as auctionable,
        ${players.altPositions} as alt_positions,
        ${players.playStyles} as play_styles,
        ${players.availableImageKinds} as available_image_kinds,
        ${players.nameColor} as name_color,
        ${players.ratingColor} as rating_color,
        ${players.positionColor} as position_color,
        ${players.addedAt} as added_at,
        ${players.fetchedAt} as fetched_at,
        ${players.parseVersion} as parse_version,
        coalesce((
          select jsonb_agg(elem)
          from jsonb_array_elements(${players.stats}) elem
          where elem->>'key' in ('avg1', 'avg2', 'avg3', 'avg4', 'avg5', 'avg6')
        ), '[]'::jsonb) as stats
      from ${players}
      where ${where}
      order by ${order}
      limit ${query.pageSize}
      offset ${offset}
    `);
    const ids = selected.rows.map((row) => String(row.id));
    return {
      rows: selected.rows,
      total,
      page,
      backgrounds: await this.backgroundUrlByPlayerId(ids),
    };
  }

  private async loadFacets(query: PlayerListQuery): Promise<PlayerListFacets> {
    const key = facetCacheKey(query);
    const cached = readFacetResult(key);
    if (cached) {
      return cached;
    }
    const facets = this.facetsAreCatalogWide(query)
      ? await this.queryCatalogFacets()
      : await this.queryFilteredFacets(query);
    writeFacetResult(key, facets);
    return facets;
  }

  private facetsAreCatalogWide(query: PlayerListQuery): boolean {
    const { filters } = query;
    return (
      playerSearchNeedle(query.q).length === 0 &&
      filters.positions.length === 0 &&
      filters.programIds.length === 0 &&
      filters.nations.length === 0 &&
      filters.clubs.length === 0 &&
      filters.leagues.length === 0 &&
      filters.ratingMin === undefined &&
      filters.ratingMax === undefined &&
      filters.auctionable === undefined
    );
  }

  /** One sequential scan. Used for the default listing, where every facet is unfiltered. */
  private async queryCatalogFacets(): Promise<PlayerListFacets> {
    const result = await this.db.execute<{
      g_program: number;
      g_position: number;
      g_nation: number;
      g_club: number;
      g_league: number;
      program_id: string | null;
      position: string | null;
      nation_name: string | null;
      club_name: string | null;
      league_name: string | null;
      n: number;
    }>(sql`
      select
        grouping(${players.programId}) as g_program,
        grouping(${players.position}) as g_position,
        grouping(${players.nationName}) as g_nation,
        grouping(${players.clubName}) as g_club,
        grouping(${players.leagueName}) as g_league,
        ${players.programId} as program_id,
        ${players.position} as position,
        ${players.nationName} as nation_name,
        ${players.clubName} as club_name,
        ${players.leagueName} as league_name,
        count(*)::int as n
      from ${players}
      group by grouping sets (
        (${players.programId}),
        (${players.position}),
        (${players.nationName}),
        (${players.clubName}),
        (${players.leagueName})
      )
    `);
    const grouped: Record<keyof PlayerListFacets, Array<[string, number]>> = {
      programs: [],
      positions: [],
      nations: [],
      clubs: [],
      leagues: [],
    };
    for (const row of result.rows) {
      const count = Number(row.n);
      if (Number(row.g_program) === 0 && row.program_id) {
        grouped.programs.push([row.program_id, count]);
      } else if (Number(row.g_position) === 0 && row.position) {
        grouped.positions.push([row.position, count]);
      } else if (Number(row.g_nation) === 0 && row.nation_name) {
        grouped.nations.push([row.nation_name, count]);
      } else if (Number(row.g_club) === 0 && row.club_name) {
        grouped.clubs.push([row.club_name, count]);
      } else if (Number(row.g_league) === 0 && row.league_name) {
        grouped.leagues.push([row.league_name, count]);
      }
    }
    return {
      programs: facetValuesFromCounts(grouped.programs),
      positions: facetValuesFromCounts(grouped.positions),
      nations: facetValuesFromCounts(grouped.nations),
      clubs: facetValuesFromCounts(grouped.clubs),
      leagues: facetValuesFromCounts(grouped.leagues),
    };
  }

  private async queryFilteredFacets(query: PlayerListQuery): Promise<PlayerListFacets> {
    const branch = (
      facet: keyof PlayerListFacets,
      column: SQL,
      filter: SQL,
    ) => sql`
      select ${facet} as facet, ${column} as value, count(*)::int as n
      from ${players}
      where ${column} is not null and ${column} <> '' and (${filter})
      group by ${column}
    `;
    const result = await this.db.execute<{
      facet: keyof PlayerListFacets;
      value: string | null;
      n: number;
    }>(sql`
      ${branch("programs", sql`${players.programId}`, sql`true`)}
      union all
      ${branch(
        "positions",
        sql`${players.position}`,
        this.buildWhere(query, new Set(["positions"])) ?? sql`true`,
      )}
      union all
      ${branch(
        "nations",
        sql`${players.nationName}`,
        this.buildWhere(query, new Set(["nations"])) ?? sql`true`,
      )}
      union all
      ${branch(
        "clubs",
        sql`${players.clubName}`,
        this.buildWhere(query, new Set(["clubs"])) ?? sql`true`,
      )}
      union all
      ${branch(
        "leagues",
        sql`${players.leagueName}`,
        this.buildWhere(query, new Set(["leagues"])) ?? sql`true`,
      )}
    `);
    const grouped: Record<keyof PlayerListFacets, Array<[string, number]>> = {
      programs: [],
      positions: [],
      nations: [],
      clubs: [],
      leagues: [],
    };
    for (const row of result.rows) {
      if (!grouped[row.facet] || row.value == null) {
        continue;
      }
      grouped[row.facet].push([row.value, Number(row.n)]);
    }
    return {
      programs: facetValuesFromCounts(grouped.programs, query.filters.programIds),
      positions: facetValuesFromCounts(grouped.positions, query.filters.positions),
      nations: facetValuesFromCounts(grouped.nations, query.filters.nations),
      clubs: facetValuesFromCounts(grouped.clubs, query.filters.clubs),
      leagues: facetValuesFromCounts(grouped.leagues, query.filters.leagues),
    };
  }

  private async backgroundUrlByPlayerId(
    ids: readonly string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.db
      .select({
        playerId: playerAssets.playerId,
        upstreamUrl: playerAssets.upstreamUrl,
      })
      .from(playerAssets)
      .where(
        and(
          eq(playerAssets.kind, "background"),
          inArray(playerAssets.playerId, [...ids]),
        ),
      );
    return new Map(rows.map((row) => [row.playerId, row.upstreamUrl]));
  }

  private buildWhere(
    query: PlayerListQuery,
    omit: ReadonlySet<PlayerListFacetFilterKey> = new Set(),
  ): SQL | undefined {
    const parts: SQL[] = [];
    const q = playerSearchNeedle(query.q);
    if (q) {
      const pattern = `%${escapeLike(q)}%`;
      parts.push(sql`${players.searchText} like ${pattern}`);
    }

    const { filters } = query;
    if (filters.positions.length > 0 && !omit.has("positions")) {
      const primary = inArray(players.position, filters.positions);
      if (filters.includeAltPositions) {
        const altMatch = sql`exists (
          select 1 from jsonb_array_elements_text(${players.altPositions}) as alt(value)
          where alt.value in (${sql.join(
            filters.positions.map((position) => sql`${position}`),
            sql`, `,
          )})
        )`;
        parts.push(or(primary, altMatch)!);
      } else {
        parts.push(primary);
      }
    }
    if (filters.programIds.length > 0 && !omit.has("programIds")) {
      parts.push(inArray(players.programId, filters.programIds));
    }
    if (filters.nations.length > 0 && !omit.has("nations")) {
      parts.push(inArray(players.nationName, filters.nations));
    }
    if (filters.clubs.length > 0 && !omit.has("clubs")) {
      parts.push(inArray(players.clubName, filters.clubs));
    }
    if (filters.leagues.length > 0 && !omit.has("leagues")) {
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
    clearPlayerListCache();
    const now = seed.discoveredAt ?? Date.now();
    const existing = await this.getById(seed.id);
    if (existing) {
      await this.db
        .update(players)
        .set({
          slug: seed.slug || existing.slug,
          name: seed.name,
          rating: seed.rating,
        })
        .where(eq(players.id, seed.id));
      return;
    }
    const player = createSeedPlayer(seed, now, SEED_PARSE_VERSION);
    await this.db.insert(players).values(playerToRow(player, now));
  }

  async upsertPlayer(player: Player, assets: PlayerAssetRow[]): Promise<void> {
    clearPlayerListCache();
    const parsed = playerSchema.parse(player);
    const existing = await this.db
      .select({ discoveredAt: players.discoveredAt })
      .from(players)
      .where(eq(players.id, parsed.id))
      .limit(1);
    const discoveredAt = existing[0]?.discoveredAt ?? parsed.fetchedAt;
    await this.db
      .insert(players)
      .values(playerToRow(parsed, discoveredAt))
      .onConflictDoUpdate({
        target: players.id,
        set: {
          ...playerToRow(parsed, discoveredAt),
          discoveredAt,
        },
      });
    await this.db
      .delete(playerAssets)
      .where(eq(playerAssets.playerId, parsed.id));
    if (assets.length > 0) {
      await this.db.insert(playerAssets).values(
        assets.map((asset) => {
          const row = playerAssetRowSchema.parse(asset);
          return {
            playerId: row.playerId,
            kind: row.kind,
            upstreamUrl: row.upstreamUrl,
            fetchedAt: row.fetchedAt,
          };
        }),
      );
    }
  }

  async getAsset(
    playerId: string,
    kind: PlayerImageKind,
  ): Promise<PlayerAssetRow | null> {
    const rows = await this.db
      .select()
      .from(playerAssets)
      .where(and(eq(playerAssets.playerId, playerId), eq(playerAssets.kind, kind)))
      .limit(1);
    const row = rows[0];
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

  async listLoopAssets(): Promise<PlayerAssetRow[]> {
    const rows = await this.db
      .select()
      .from(playerAssets)
      .where(like(playerAssets.kind, "loop-%"));
    return rows.flatMap((row) => {
      const parsed = playerAssetRowSchema.safeParse({
        playerId: row.playerId,
        kind: row.kind,
        upstreamUrl: row.upstreamUrl,
        fetchedAt: row.fetchedAt,
      });
      return parsed.success ? [parsed.data] : [];
    });
  }

  async findSharedIconAsset(
    kind: PlayerImageKind,
  ): Promise<PlayerAssetRow | null> {
    if (!isPlayerIconImageKind(kind)) {
      return null;
    }
    const rows = await this.db
      .select()
      .from(playerAssets)
      .where(eq(playerAssets.kind, kind))
      .orderBy(desc(playerAssets.fetchedAt))
      .limit(1);
    const row = rows[0];
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
    return this.enqueue(playerId, "discovery", slug, now);
  }

  async enqueueRefresh(
    playerId: string,
    slug?: string,
    now?: number,
  ): Promise<IngestJob> {
    return this.enqueue(playerId, "refresh", slug, now);
  }

  async claimNext(
    limit: number,
    now = Date.now(),
    leaseMs = DEFAULT_LEASE_MS,
    kind?: IngestJobKind,
  ): Promise<IngestJob[]> {
    await this.db
      .update(ingestJobs)
      .set({ status: "pending", claimedAt: null })
      .where(
        and(
          eq(ingestJobs.status, "in_progress"),
          lte(ingestJobs.claimedAt, now - leaseMs),
        ),
      );
    const due = await this.db
      .select()
      .from(ingestJobs)
      .where(
        and(
          eq(ingestJobs.status, "pending"),
          lte(ingestJobs.nextAttemptAt, now),
          kind ? eq(ingestJobs.kind, kind) : undefined,
        ),
      )
      .orderBy(asc(ingestJobs.nextAttemptAt), asc(ingestJobs.createdAt))
      .limit(limit);
    const claimed: IngestJob[] = [];
    for (const job of due) {
      await this.db
        .update(ingestJobs)
        .set({
          status: "in_progress",
          claimedAt: now,
          attempts: job.attempts + 1,
        })
        .where(eq(ingestJobs.id, job.id));
      claimed.push(
        jobToDomain({
          ...job,
          status: "in_progress",
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
    const result = await this.db
      .update(ingestJobs)
      .set({
        status: "skipped",
        lastError: reason,
        completedAt: now,
        claimedAt: null,
      })
      .where(
        and(
          eq(ingestJobs.kind, "discovery"),
          inArray(ingestJobs.status, ["pending", "failed"]),
          lte(ingestJobs.createdAt, createdAtOnOrBefore),
        ),
      );
    return result.rowCount ?? 0;
  }

  async skipDiscoveryJobsByPlayerIds(
    entries: Array<{ id: string; slug?: string }>,
    reason: string,
    now = Date.now(),
  ): Promise<number> {
    const ids = [...new Set(entries.map((entry) => playerIdSchema.parse(entry.id)))];
    if (ids.length === 0) {
      return 0;
    }
    const chunkSize = 400;
    let updated = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const result = await this.db
        .update(ingestJobs)
        .set({
          status: "skipped",
          lastError: reason,
          completedAt: now,
          claimedAt: null,
        })
        .where(
          and(
            eq(ingestJobs.kind, "discovery"),
            inArray(ingestJobs.status, ["pending", "failed", "in_progress"]),
            inArray(ingestJobs.playerId, chunk),
          ),
        );
      updated += result.rowCount ?? 0;
    }
    const slugById = new Map(entries.map((entry) => [entry.id, entry.slug]));
    for (const id of ids) {
      await this.recordSkipped(id, slugById.get(id), reason, now);
    }
    return updated;
  }

  async clearSkipped(playerIds: readonly string[]): Promise<number> {
    const ids = [...new Set(playerIds.map((playerId) => playerIdSchema.parse(playerId)))];
    if (ids.length === 0) {
      return 0;
    }
    const chunkSize = 400;
    let cleared = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const deleted = await this.db
        .delete(ingestJobs)
        .where(
          and(eq(ingestJobs.status, "skipped"), inArray(ingestJobs.playerId, chunk)),
        )
        .returning({ id: ingestJobs.id });
      cleared += deleted.length;
    }
    return cleared;
  }

  async markSucceeded(jobId: number, now = Date.now()): Promise<void> {
    await this.db
      .update(ingestJobs)
      .set({ status: "succeeded", completedAt: now, lastError: null })
      .where(eq(ingestJobs.id, jobId));
  }

  async markFailed(
    jobId: number,
    error: string,
    nextAttemptAt: number,
    now = Date.now(),
  ): Promise<void> {
    await this.db
      .update(ingestJobs)
      .set({
        status: "failed",
        lastError: error,
        completedAt: now,
        nextAttemptAt,
        claimedAt: null,
      })
      .where(eq(ingestJobs.id, jobId));
  }

  async markRetry(
    jobId: number,
    error: string,
    nextAttemptAt: number,
    now = Date.now(),
  ): Promise<void> {
    await this.db
      .update(ingestJobs)
      .set({
        status: "pending",
        lastError: error,
        nextAttemptAt,
        claimedAt: null,
        completedAt: now,
      })
      .where(eq(ingestJobs.id, jobId));
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
    const rows = await this.db
      .select({ id: players.id })
      .from(players)
      .where(where);
    return rows.map((row) => asPlayerId(row.id));
  }

  async countOpenIngestJobs(kind?: IngestJobKind): Promise<number> {
    const rows = await this.db
      .select({ n: count() })
      .from(ingestJobs)
      .where(
        and(
          inArray(ingestJobs.status, ["pending", "in_progress"]),
          kind ? eq(ingestJobs.kind, kind) : undefined,
        ),
      );
    return Number(rows[0]?.n ?? 0);
  }

  private async enqueue(
    playerId: string,
    kind: IngestJob["kind"],
    slug: string | undefined,
    now = Date.now(),
  ): Promise<IngestJob> {
    const id = playerIdSchema.parse(playerId);
    if (kind === "discovery") {
      const skipped = await this.db
        .select()
        .from(ingestJobs)
        .where(and(eq(ingestJobs.playerId, id), eq(ingestJobs.status, "skipped")))
        .limit(1);
      if (skipped[0]) {
        return jobToDomain(skipped[0]);
      }
    }
    const existing = await this.db
      .select()
      .from(ingestJobs)
      .where(
        and(
          eq(ingestJobs.playerId, id),
          eq(ingestJobs.kind, kind),
          inArray(ingestJobs.status, ["pending", "in_progress"]),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return jobToDomain(existing[0]);
    }
    const inserted = await this.db
      .insert(ingestJobs)
      .values({
        playerId: id,
        slug: slug ?? null,
        kind,
        status: "pending",
        attempts: 0,
        lastError: null,
        claimedAt: null,
        completedAt: null,
        nextAttemptAt: now,
        createdAt: now,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error(`Failed to enqueue ${kind} job for ${id}`);
    }
    return jobToDomain(row);
  }
}
