import { NotFoundError, ParseError, UpstreamHttpError } from "@/lib/http/errors";
import type {
  GetPlayerResult,
  ListingSeed,
  PlayerDataSource,
  SitemapEntry,
} from "@/lib/providers/types";
import { RenderzClient } from "@/lib/providers/renderz/client";
import { parseListingSeed } from "@/lib/providers/renderz/listing-parser";
import { parsePlayerPage } from "@/lib/providers/renderz/player-parser";
import {
  parseSitemapChildLocs,
  parseSitemapPlayerLocs,
} from "@/lib/providers/renderz/sitemap-parser";
import {
  playerDataUrl,
  playerUrl,
  playersDataUrl,
  playersUrl,
  RENDERZ_ORIGIN,
  sitemapIndexUrl,
} from "@/lib/providers/renderz/urls";

export class RenderzHtmlSource implements PlayerDataSource {
  constructor(private readonly client = new RenderzClient()) {}

  async getListingSeed(): Promise<ListingSeed[]> {
    const html = await this.client.getText(playersUrl());
    const dataJson = await this.optionalText(playersDataUrl());
    return parseListingSeed({ html, dataJson });
  }

  async getPlayer(id: string, slug?: string): Promise<GetPlayerResult> {
    const html = await this.client.getText(playerUrl(id, slug));
    const dataJson = await this.optionalText(playerDataUrl(id, slug));
    try {
      return parsePlayerPage({ html, dataJson });
    } catch (error) {
      if (error instanceof ParseError && !slug) {
        throw new NotFoundError(`Player ${id} could not be parsed`);
      }
      throw error;
    }
  }

  async listSitemapEntries(): Promise<SitemapEntry[]> {
    const indexXml = await this.client.getText(sitemapIndexUrl());
    const childLocs = parseSitemapChildLocs(indexXml);
    const entries: SitemapEntry[] = [];
    const seen = new Set<string>();
    for (const loc of childLocs) {
      let parsed: URL;
      try {
        parsed = new URL(loc);
      } catch {
        continue;
      }
      if (parsed.origin !== RENDERZ_ORIGIN) {
        continue;
      }
      const xml = await this.client.getText(loc);
      for (const entry of parseSitemapPlayerLocs(xml)) {
        if (seen.has(entry.id)) {
          continue;
        }
        seen.add(entry.id);
        entries.push(entry);
      }
    }
    return entries;
  }

  private async optionalText(url: string): Promise<string | undefined> {
    try {
      return await this.client.getText(url);
    } catch (error) {
      if (error instanceof UpstreamHttpError) {
        return undefined;
      }
      throw error;
    }
  }
}

let shared: RenderzHtmlSource | undefined;

export function getRenderzSource(): RenderzHtmlSource {
  shared ??= new RenderzHtmlSource();
  return shared;
}
