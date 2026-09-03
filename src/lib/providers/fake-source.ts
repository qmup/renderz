import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import {
  parsePlayerId,
  type Player,
  type PlayerAssetRow,
  type PlayerId,
  type PlayerSeed,
} from "@/lib/domain/player";
import type {
  GetPlayerResult,
  ListingSeed,
  PlayerDataSource,
  SitemapEntry,
} from "@/lib/providers/types";
import { NotFoundError } from "@/lib/http/errors";

export type FakePlayerRecord = {
  seed: ListingSeed;
  player?: Player;
  assets?: PlayerAssetRow[];
};

export class FakePlayerDataSource implements PlayerDataSource {
  readonly getPlayerCalls: string[] = [];

  constructor(private readonly records: Map<string, FakePlayerRecord>) {}

  static fromPlayers(players: Player[], assets: PlayerAssetRow[] = []): FakePlayerDataSource {
    const records = new Map<string, FakePlayerRecord>();
    for (const player of players) {
      records.set(player.id, {
        seed: {
          id: player.id,
          slug: player.slug,
          name: player.name,
          rating: player.rating,
        },
        player,
        assets: assets.filter((asset) => asset.playerId === player.id),
      });
    }
    return new FakePlayerDataSource(records);
  }

  async getListingSeed(): Promise<ListingSeed[]> {
    return [...this.records.values()].map((record) => record.seed);
  }

  async getPlayer(id: string, slug?: string): Promise<GetPlayerResult> {
    this.getPlayerCalls.push(id);
    const record = this.records.get(id);
    if (!record?.player) {
      throw new NotFoundError(`Fake source has no player ${id}`);
    }
    if (slug && record.player.slug && slug !== record.player.slug) {
      throw new NotFoundError(`Fake source slug mismatch for ${id}`);
    }
    return {
      player: record.player,
      assets: record.assets ?? [],
    };
  }

  async listSitemapEntries(): Promise<SitemapEntry[]> {
    return [...this.records.values()].map((record) => ({
      id: record.seed.id,
      slug: record.seed.slug,
    }));
  }
}

export function fakePlayer(
  overrides: Partial<Omit<Player, "id">> & { id: string; name: string; rating: number },
): Player {
  const now = overrides.fetchedAt ?? 1_700_000_000_000;
  return {
    slug: overrides.slug ?? overrides.name.toLowerCase().replaceAll(/\s+/g, "-"),
    availableImageKinds: overrides.availableImageKinds ?? [],
    altPositions: overrides.altPositions ?? [],
    stats: overrides.stats ?? [],
    traits: overrides.traits ?? [],
    playStyles: overrides.playStyles ?? [],
    skills: overrides.skills ?? [],
    relatedCardIds: overrides.relatedCardIds ?? [],
    parseVersion: overrides.parseVersion ?? CURRENT_PARSE_VERSION,
    fetchedAt: now,
    ...overrides,
    id: parsePlayerId(overrides.id),
  };
}

export function fakeSeed(
  id: string,
  name: string,
  rating: number,
  slug = name.toLowerCase().replaceAll(/\s+/g, "-"),
): PlayerSeed {
  return {
    id: parsePlayerId(id),
    slug,
    name,
    rating,
  };
}

export function asId(id: string): PlayerId {
  return parsePlayerId(id);
}
