import type { PlayerCatalog } from '@/lib/catalog/repository';

/** Stable program ids. RenderZ leaves `source` empty on these cards. */
export const BASE_PROGRAM_GOLD = 'FC_BASE_GOLD';
export const BASE_PROGRAM_SILVER = 'FC_BASE_SILVER';

export const BASE_LABEL_GOLD = 'FC Base Gold Player';
export const BASE_LABEL_SILVER = 'FC Base Silver Player';

/**
 * How many missing base cards one catalog sync fetches.
 * RenderZ has about 6,200 gold and silver cards. The daily job also uploads
 * their art, so each run takes a slice and the next run continues.
 */
export const BASE_CARD_SYNC_LIMIT = 1500;

export type BaseCardTier = 'gold' | 'silver';

export function isBaseCardProgram(programId: string | undefined): boolean {
  if (!programId) {
    return false;
  }
  const key = programId.trim().toUpperCase();
  return key === BASE_PROGRAM_GOLD || key === BASE_PROGRAM_SILVER;
}

export function baseCardTier(input: {
  programName?: string;
  bindingXml?: string;
  artHint?: string;
}): BaseCardTier | null {
  return (
    tierFromLabel(input.programName) ??
    tierFromArt(input.bindingXml) ??
    tierFromArt(input.artHint)
  );
}

export function assignBaseCardIdentity<
  T extends { programId?: string; programName?: string },
>(
  player: T,
  hints: { bindingXml?: string; artHint?: string } = {},
): T {
  if (player.programId && !isBaseCardProgram(player.programId)) {
    return player;
  }
  const tier = baseCardTier({
    programName: player.programName,
    bindingXml: hints.bindingXml,
    artHint: hints.artHint,
  });
  if (!tier) {
    return player;
  }
  const label = tier === 'gold' ? BASE_LABEL_GOLD : BASE_LABEL_SILVER;
  return {
    ...player,
    programId: tier === 'gold' ? BASE_PROGRAM_GOLD : BASE_PROGRAM_SILVER,
    programName: player.programName?.trim() || label,
  };
}

/**
 * Re-open ids that were skipped as too old, then queue them.
 * Call this after the newest-first sitemap walk so that walk cannot mark
 * the batch skipped when it hits three old promo cards.
 */
export async function enqueueBaseCardDiscoveries(
  catalog: PlayerCatalog,
  entries: ReadonlyArray<{ id: string; slug?: string }>,
  now = Date.now(),
): Promise<number> {
  if (entries.length === 0) {
    return 0;
  }
  await catalog.clearSkipped(entries.map((entry) => entry.id));
  for (const [index, entry] of entries.entries()) {
    await catalog.enqueueDiscovery(entry.id, entry.slug, now + index);
  }
  return entries.length;
}

function tierFromLabel(value: string | undefined): BaseCardTier | null {
  if (!value) {
    return null;
  }
  const text = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (text === 'fc base gold player') {
    return 'gold';
  }
  if (text === 'fc base silver player') {
    return 'silver';
  }
  return null;
}

function tierFromArt(value: string | undefined): BaseCardTier | null {
  if (!value) {
    return null;
  }
  const text = value.toLowerCase();
  if (text.includes('bronze')) {
    return null;
  }
  if (text.includes('gold_base') || text.includes('base_gold')) {
    return 'gold';
  }
  if (
    text.includes('silver_base') ||
    text.includes('sliver_base') ||
    text.includes('base_silver') ||
    text.includes('base_sliver')
  ) {
    return 'silver';
  }
  return null;
}
