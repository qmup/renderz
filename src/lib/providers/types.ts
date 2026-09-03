import type { Player, PlayerAssetRow, PlayerId, PlayerSeed } from "@/lib/domain/player";

export type ListingSeed = PlayerSeed;

export type GetPlayerResult = {
  player: Player;
  assets: PlayerAssetRow[];
};

export type SitemapEntry = {
  id: PlayerId;
  slug: string;
};

export interface PlayerDataSource {
  getListingSeed(): Promise<ListingSeed[]>;
  getPlayer(id: string, slug?: string): Promise<GetPlayerResult>;
  listSitemapEntries(): Promise<SitemapEntry[]>;
}
