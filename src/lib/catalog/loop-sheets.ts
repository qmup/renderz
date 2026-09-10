import { readLoopPublicFile, sharedLoopCacheId, loopSheetFileName, loopPublicFilePath } from '@/lib/catalog/image-cache';
import type { PlayerCatalog } from '@/lib/catalog/repository';

export type LoopSheetStatus = {
  sharedId: string;
  fileName: string;
  filePath: string;
  present: boolean;
  samplePlayerId: string;
  upstreamUrl: string;
};

export type LoopSheetReport = {
  total: number;
  present: number;
  missing: LoopSheetStatus[];
};

/**
 * Unique LOOP sprite sheets referenced by the catalog, and whether each PNG
 * exists under public/loops (usable image bytes, not an LFS pointer).
 */
export async function collectLoopSheetStatuses(
  catalog: PlayerCatalog,
  cwd = process.cwd(),
): Promise<LoopSheetStatus[]> {
  const byId = new Map<string, LoopSheetStatus>();
  for (const asset of await catalog.listLoopAssets()) {
    const sharedId = sharedLoopCacheId(asset.upstreamUrl);
    const fileName = loopSheetFileName(asset.upstreamUrl);
    const filePath = loopPublicFilePath(asset.upstreamUrl, cwd);
    if (!sharedId || !fileName || !filePath || byId.has(sharedId)) {
      continue;
    }
    byId.set(sharedId, {
      sharedId,
      fileName,
      filePath,
      present: readLoopPublicFile(asset.upstreamUrl, cwd) !== null,
      samplePlayerId: asset.playerId,
      upstreamUrl: asset.upstreamUrl,
    });
  }
  return [...byId.values()].sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function summarizeLoopSheets(
  statuses: readonly LoopSheetStatus[],
): LoopSheetReport {
  const missing = statuses.filter((row) => !row.present);
  return {
    total: statuses.length,
    present: statuses.length - missing.length,
    missing,
  };
}

export async function reportLoopSheets(
  catalog: PlayerCatalog,
  cwd = process.cwd(),
): Promise<LoopSheetReport> {
  return summarizeLoopSheets(await collectLoopSheetStatuses(catalog, cwd));
}

/** Throws when any catalog LOOP sheet is missing from public/loops. */
export async function assertLoopSheetsPresent(
  catalog: PlayerCatalog,
  cwd = process.cwd(),
): Promise<LoopSheetReport> {
  const report = await reportLoopSheets(catalog, cwd);
  if (report.missing.length === 0) {
    return report;
  }
  const lines = report.missing.map(
    (row) =>
      `  - ${row.fileName} (e.g. player ${row.samplePlayerId}) → public/loops/${row.fileName}`,
  );
  throw new Error(
    [
      `Missing ${report.missing.length}/${report.total} LOOP sprite sheet(s) in public/loops.`,
      'New card designs will have no detail animation until these PNGs are packed.',
      'Fix: npm run catalog:cache-images   # or npm run catalog:cache-missing-loops',
      ...lines,
    ].join('\n'),
  );
}
