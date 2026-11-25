import type { Player, PlayerStat, SkillLevel, SkillNode } from '@/lib/domain/player';
import { normalizePlayerSkills, resolveSkillName } from '@/lib/skill-names';

export const MIN_RANK = 0;
export const MAX_RANK = 6;
export const RANK_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;
export type RankLevel = (typeof RANK_LEVELS)[number];

/** Only min (0) and max (30) training levels are selectable (1–29 skipped). */
export const TRAINING_LEVELS = [0, 30] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

export type SkillUpgradeSelection = {
  id: string;
  level: number;
};

export type PlayerUpgradeState = {
  rank: RankLevel;
  trainingLevel: TrainingLevel;
  skillUpgrades: SkillUpgradeSelection[];
};

export const INITIAL_UPGRADE_STATE: PlayerUpgradeState = {
  rank: 0,
  trainingLevel: 0,
  skillUpgrades: [],
};

/**
 * Exact FC Mobile / RenderZ Training Level 30 stat modifiers per position
 * (decoded from RenderZ's official position modifier table).
 */
export const TRAINING_LEVEL_30_MODIFIERS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  CAM: {
    acc: 24, agg: 18, awr: 18, bac: 36, bal: 24, cro: 18, cur: 24, dri: 36,
    fin: 18, frk: 12, hea: 18, jmp: 12, lpa: 18, lsa: 36, mrk: 6, pen: 6,
    pos: 36, rea: 24, sho: 24, spa: 36, spd: 24, stt: 6, str: 12, vis: 36,
    vol: 36, agi: 36,
  },
  CB: {
    acc: 18, agg: 24, awr: 36, bac: 36, bal: 24, cro: 6, cur: 18, dri: 12,
    fin: 12, frk: 12, hea: 36, jmp: 36, lpa: 24, lsa: 18, mrk: 36, pen: 6,
    rea: 24, sho: 18, slt: 36, spa: 18, spd: 24, stt: 36, str: 36, vis: 18,
    vol: 6, agi: 24,
  },
  CDM: {
    acc: 24, agg: 24, awr: 36, bac: 36, bal: 24, cro: 6, cur: 6, dri: 24,
    fin: 12, frk: 12, hea: 18, jmp: 18, lpa: 36, lsa: 18, mrk: 36, pen: 6,
    rea: 24, sho: 18, slt: 36, spa: 36, spd: 18, stt: 36, str: 36, vis: 24,
    vol: 12, agi: 18,
  },
  CF: {
    acc: 24, agg: 18, awr: 6, bac: 36, bal: 24, cro: 12, cur: 36, dri: 36,
    fin: 24, frk: 12, hea: 36, jmp: 18, lpa: 18, lsa: 36, pen: 6, pos: 24,
    rea: 18, sho: 36, slt: 6, spa: 24, spd: 24, stt: 12, str: 18, vis: 18,
    vol: 36, agi: 36,
  },
  CM: {
    acc: 24, agg: 12, awr: 36, bac: 36, bal: 24, cro: 18, cur: 18, dri: 36,
    fin: 18, frk: 12, hea: 6, lpa: 36, lsa: 36, mrk: 18, pen: 6, pos: 12,
    rea: 24, sho: 24, slt: 6, spa: 36, spd: 24, stt: 36, str: 18, vis: 36,
    vol: 18, agi: 24,
  },
  GK: {
    acc: 6, agg: 18, awr: 18, bac: 24, bal: 24, cro: 12, dri: 18, frk: 12,
    hea: 24, jmp: 36, lpa: 24, mrk: 6, pen: 6, rea: 36, slt: 18, spa: 24,
    spd: 18, stt: 12, str: 24, vis: 18, agi: 36, gkd: 36, gkk: 36, gkp: 36,
    han: 36, ref: 36,
  },
  LB: {
    acc: 36, agg: 18, awr: 36, bac: 36, bal: 24, cro: 36, cur: 18, dri: 36,
    fin: 6, frk: 12, hea: 12, jmp: 12, lpa: 24, lsa: 18, mrk: 36, pen: 6,
    pos: 6, rea: 24, sho: 18, slt: 18, spa: 24, spd: 36, stt: 36, str: 24,
    vis: 18, agi: 24,
  },
  LF: {
    acc: 46, agg: 49, bac: 44, bal: 54, cro: 50, cur: 50, dri: 43, fin: 50,
    frk: 40, hea: 35, jmp: 43, lpa: 56, lsa: 49, mrk: 44, pen: 38, pos: 44,
    rea: 50, sho: 37, slt: 52, spa: 49, spd: 50, stt: 41, str: 51, vis: 39,
    vol: 52, agi: 42, gkd: 39, gkk: 45, gkp: 46, han: 39, ref: 44, sta: 53,
  },
  LM: {
    acc: 36, agg: 12, awr: 18, bac: 36, bal: 24, cro: 36, cur: 24, dri: 36,
    fin: 18, frk: 12, hea: 6, lpa: 36, lsa: 24, mrk: 18, pen: 6, pos: 18,
    rea: 24, sho: 24, slt: 6, spa: 24, spd: 36, stt: 18, str: 12, vis: 36,
    vol: 18, agi: 36,
  },
  LW: {
    acc: 36, agg: 18, awr: 6, bac: 36, bal: 24, cro: 24, cur: 18, dri: 36,
    fin: 36, frk: 12, hea: 18, jmp: 12, lpa: 18, lsa: 24, mrk: 6, pen: 6,
    pos: 36, rea: 24, sho: 24, spa: 36, spd: 36, stt: 12, str: 18, vis: 24,
    vol: 18, agi: 36,
  },
  LWB: {
    acc: 36, agg: 24, awr: 24, bac: 36, bal: 24, cro: 36, cur: 24, dri: 36,
    frk: 12, hea: 12, jmp: 18, lpa: 24, lsa: 6, mrk: 18, pen: 6, pos: 12,
    rea: 36, sho: 18, slt: 18, spa: 24, spd: 36, stt: 18, str: 18, vis: 36,
    vol: 6, agi: 36,
  },
  RB: {
    acc: 36, agg: 18, awr: 36, bac: 36, bal: 24, cro: 36, cur: 18, dri: 36,
    fin: 6, frk: 12, hea: 12, jmp: 12, lpa: 24, lsa: 18, mrk: 36, pen: 6,
    pos: 6, rea: 24, sho: 18, slt: 18, spa: 24, spd: 36, stt: 36, str: 24,
    vis: 18, agi: 24,
  },
  RF: {
    acc: 39, agg: 49, bac: 44, bal: 51, cro: 44, cur: 47, dri: 46, fin: 44,
    frk: 46, hea: 47, jmp: 43, lpa: 43, lsa: 43, mrk: 39, pen: 45, pos: 38,
    rea: 36, sho: 40, slt: 43, spa: 35, spd: 51, stt: 39, str: 53, vis: 36,
    vol: 58, agi: 47, gkd: 48, gkk: 45, gkp: 38, han: 33, ref: 50, sta: 40,
  },
  RM: {
    acc: 36, agg: 12, awr: 18, bac: 36, bal: 24, cro: 36, cur: 24, dri: 36,
    fin: 18, frk: 12, hea: 6, lpa: 36, lsa: 24, mrk: 18, pen: 6, pos: 18,
    rea: 24, sho: 24, slt: 6, spa: 24, spd: 36, stt: 18, str: 12, vis: 36,
    vol: 18, agi: 36,
  },
  RW: {
    acc: 36, agg: 18, awr: 6, bac: 36, bal: 24, cro: 24, cur: 18, dri: 36,
    fin: 36, frk: 12, hea: 18, jmp: 12, lpa: 18, lsa: 24, mrk: 6, pen: 6,
    pos: 36, rea: 24, sho: 24, spa: 36, spd: 36, stt: 12, str: 18, vis: 24,
    vol: 18, agi: 36,
  },
  RWB: {
    acc: 36, agg: 24, awr: 24, bac: 36, bal: 24, cro: 36, cur: 24, dri: 36,
    frk: 12, hea: 12, jmp: 18, lpa: 24, lsa: 6, mrk: 18, pen: 6, pos: 12,
    rea: 36, sho: 18, slt: 18, spa: 24, spd: 36, stt: 18, str: 18, vis: 36,
    vol: 6, agi: 36,
  },
  ST: {
    acc: 36, agg: 24, awr: 6, bac: 36, bal: 24, cro: 12, cur: 18, dri: 24,
    fin: 36, frk: 12, hea: 36, jmp: 36, lpa: 18, lsa: 24, pen: 6, pos: 24,
    rea: 18, sho: 36, slt: 6, spa: 18, spd: 36, stt: 12, str: 36, vis: 18,
    vol: 18, agi: 24,
  },
};

const AVG_WEIGHTS_OUTFIELD: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  avg1: { acc: 50, spd: 50 },
  avg2: { fin: 35, lsa: 20, sho: 20, pos: 15, vol: 5, pen: 5 },
  avg3: { spa: 30, lpa: 20, vis: 25, cro: 15, cur: 5, frk: 5 },
  avg4: { dri: 25, bac: 25, agi: 25, rea: 15, bal: 10 },
  avg5: { mrk: 25, stt: 20, slt: 20, awr: 20, hea: 15 },
  avg6: { str: 45, agg: 30, jmp: 25 },
};

const AVG_WEIGHTS_GK: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  avg1: { gkd: 100 },
  avg2: { gkp: 100 },
  avg3: { han: 100 },
  avg4: { ref: 100 },
  avg5: { gkk: 100 },
  avg6: { rea: 65, agi: 15, spd: 10, str: 10 },
};

export function clampRank(value: number): RankLevel {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n <= MIN_RANK) {
    return 0;
  }
  if (n >= MAX_RANK) {
    return 6;
  }
  return n as RankLevel;
}

export function normalizeTrainingLevel(value: number): TrainingLevel {
  return value >= 30 ? 30 : 0;
}

export function spentSkillPoints(
  upgrades: readonly SkillUpgradeSelection[],
): number {
  return upgrades.reduce((sum, item) => sum + Math.max(0, item.level), 0);
}

export function remainingSkillPoints(
  rank: RankLevel,
  upgrades: readonly SkillUpgradeSelection[],
): number {
  return Math.max(0, rank - spentSkillPoints(upgrades));
}

export type SkillLevelViewState = SkillLevel & {
  state: 'locked' | 'available' | 'acquired';
  isDisabled: boolean;
  isRequirementMet: boolean;
};

export type SkillViewState = {
  id: string;
  key?: string;
  name: string;
  currentLevel: number;
  maxLevel: number;
  isRequirementMet: boolean;
  isDisabled: boolean;
  hasLevels: boolean;
  requirement: {
    skillId: string;
    level: number;
    skillName: string;
  } | null;
  levelsState: SkillLevelViewState[];
};

export function getSkillStates(
  rawSkills: readonly SkillNode[],
  upgrades: readonly SkillUpgradeSelection[],
  rank: RankLevel,
): SkillViewState[] {
  const skills = normalizePlayerSkills(rawSkills);
  const remaining = remainingSkillPoints(rank, upgrades);
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const upgradeById = new Map(upgrades.map((item) => [item.id, item.level]));

  return skills.map((skill) => {
    const currentLevel = upgradeById.get(skill.id) ?? 0;
    const req = skill.requirement ?? null;
    const reqLevel = req ? (upgradeById.get(req.skillId) ?? 0) : 0;
    const isRequirementMet = !req || reqLevel >= req.level;
    const levels = skill.levels ?? [];
    const hasLevels = levels.length > 0;

    const levelsState: SkillLevelViewState[] = levels.map((lvl) => {
      let state: 'locked' | 'available' | 'acquired' = 'locked';
      let isDisabled = true;
      if (isRequirementMet) {
        if (currentLevel >= lvl.level) {
          state = 'acquired';
          isDisabled = false;
        } else if (remaining + currentLevel >= lvl.level) {
          state = 'available';
          isDisabled = false;
        }
      }
      return {
        ...lvl,
        state,
        isDisabled,
        isRequirementMet,
      };
    });

    const isDisabled =
      !hasLevels || !isRequirementMet || (remaining === 0 && currentLevel === 0);

    const reqSkill = req ? byId.get(req.skillId) : undefined;
    return {
      id: skill.id,
      key: skill.key,
      name: resolveSkillName(skill),
      currentLevel,
      maxLevel: levels.reduce((max, lvl) => Math.max(max, lvl.level), 0),
      isRequirementMet,
      isDisabled,
      hasLevels,
      requirement: req
        ? {
            skillId: req.skillId,
            level: req.level,
            skillName: reqSkill ? resolveSkillName(reqSkill) : req.skillId,
          }
        : null,
      levelsState,
    };
  });
}

function pruneUnmetRequirements(
  skills: readonly SkillNode[],
  upgrades: Map<string, number>,
): void {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id] of upgrades) {
      const req = byId.get(id)?.requirement;
      if (!req) {
        continue;
      }
      const reqLevel = upgrades.get(req.skillId) ?? 0;
      if (reqLevel < req.level) {
        upgrades.delete(id);
        changed = true;
      }
    }
  }
}

/**
 * Select or toggle a skill level. Clicking the currently active level clears
 * that skill; selecting another available level sets it. Automatically removes
 * any dependent skills whose requirement is no longer satisfied.
 */
export function toggleSkillUpgrade(
  rawSkills: readonly SkillNode[],
  upgrades: readonly SkillUpgradeSelection[],
  skillId: string,
  targetLevel: number,
  rank: RankLevel,
): SkillUpgradeSelection[] {
  const skills = normalizePlayerSkills(rawSkills);
  const states = getSkillStates(skills, upgrades, rank);
  const skillState = states.find((item) => item.id === skillId);
  const levelState = skillState?.levelsState.find(
    (item) => item.level === targetLevel,
  );
  if (!skillState || !levelState || levelState.state === 'locked') {
    return [...upgrades];
  }

  const next = new Map(upgrades.map((item) => [item.id, item.level]));
  const current = next.get(skillId) ?? 0;
  if (current === targetLevel) {
    next.delete(skillId);
  } else {
    next.set(skillId, targetLevel);
  }

  pruneUnmetRequirements(skills, next);
  return Array.from(next.entries()).map(([id, level]) => ({ id, level }));
}

/**
 * Direct one-click skill toggle: upgrades immediately to the highest affordable
 * level (e.g. LVL 0 -> LVL 2 in a single click when enough SP is available).
 * Clicking again when already at the highest affordable level clears it back
 * to 0 and cascades removal of any dependent skills.
 */
export function toggleSkillToMax(
  rawSkills: readonly SkillNode[],
  upgrades: readonly SkillUpgradeSelection[],
  skillId: string,
  rank: RankLevel,
): SkillUpgradeSelection[] {
  const skills = normalizePlayerSkills(rawSkills);
  const states = getSkillStates(skills, upgrades, rank);
  const skillState = states.find((item) => item.id === skillId);
  if (!skillState || !skillState.hasLevels || !skillState.isRequirementMet) {
    return [...upgrades];
  }

  let highestAvailable = 0;
  for (const lvl of skillState.levelsState) {
    if (lvl.state === 'available' && lvl.level > highestAvailable) {
      highestAvailable = lvl.level;
    }
  }

  if (highestAvailable > skillState.currentLevel) {
    return toggleSkillUpgrade(skills, upgrades, skillId, highestAvailable, rank);
  }
  if (skillState.currentLevel > 0) {
    return toggleSkillUpgrade(
      skills,
      upgrades,
      skillId,
      skillState.currentLevel,
      rank,
    );
  }
  return [...upgrades];
}

export function selectRankState(
  state: PlayerUpgradeState,
  nextRankInput: number,
): PlayerUpgradeState {
  const nextRank = clampRank(nextRankInput);
  if (nextRank === 0) {
    if (state.rank === 0 && state.skillUpgrades.length === 0) {
      return state;
    }
    return { ...state, rank: 0, skillUpgrades: [] };
  }
  if (nextRank === state.rank) {
    return state;
  }
  const spent = spentSkillPoints(state.skillUpgrades);
  if (spent > nextRank) {
    return { ...state, rank: nextRank, skillUpgrades: [] };
  }
  return { ...state, rank: nextRank };
}

export function selectTrainingState(
  state: PlayerUpgradeState,
  nextLevelInput: number,
): PlayerUpgradeState {
  const nextLevel = normalizeTrainingLevel(nextLevelInput);
  if (nextLevel === state.trainingLevel) {
    return state;
  }
  return { ...state, trainingLevel: nextLevel };
}

export type ComputedUpgradedPlayer = {
  baseRating: number;
  rating: number;
  rank: RankLevel;
  trainingLevel: TrainingLevel;
  stats: PlayerStat[];
  /** Positive per-stat deltas (key -> upgraded - base). */
  deltas: Record<string, number>;
  unlockedPositions: string[];
  totalStats?: number;
};

export function computeAvgStats(
  statValues: Readonly<Record<string, number>>,
  position?: string,
): Record<string, number> {
  const weights =
    position?.toUpperCase() === 'GK' ? AVG_WEIGHTS_GK : AVG_WEIGHTS_OUTFIELD;
  const out: Record<string, number> = {};
  for (const [avgKey, groupWeights] of Object.entries(weights)) {
    let sum = 0;
    for (const [statKey, weight] of Object.entries(groupWeights)) {
      sum += (statValues[statKey] ?? 0) * weight;
    }
    out[avgKey] = Math.floor(sum / 100);
  }
  return out;
}

export function computeUpgradedPlayer(
  player: Pick<Player, 'rating' | 'position' | 'stats' | 'skills' | 'totalStats'>,
  state: PlayerUpgradeState,
): ComputedUpgradedPlayer {
  const rank = clampRank(state.rank);
  const trainingLevel = normalizeTrainingLevel(state.trainingLevel);
  const rating = player.rating + rank;

  const skills = normalizePlayerSkills(player.skills);
  const baseByKey: Record<string, number> = {};
  for (const stat of player.stats) {
    baseByKey[stat.key] = stat.value;
  }

  const hasTraining = trainingLevel === 30;
  const posKey = player.position?.toUpperCase() ?? '';
  const trainingMods = hasTraining
    ? (TRAINING_LEVEL_30_MODIFIERS[posKey] ?? {})
    : {};

  const skillMods: Record<string, number> = {};
  const unlockedPositions: string[] = [];
  const seenUnlocked = new Set<string>();

  if (state.skillUpgrades.length > 0 && rank > 0) {
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    for (const selected of state.skillUpgrades) {
      const node = skillById.get(selected.id);
      const lvl = node?.levels?.find((item) => item.level === selected.level);
      if (!lvl) {
        continue;
      }
      for (const [statKey, bonus] of Object.entries(lvl.abilityModifiers)) {
        if (typeof bonus === 'number' && Number.isFinite(bonus)) {
          skillMods[statKey] = (skillMods[statKey] ?? 0) + bonus;
        }
      }
      for (const pos of lvl.unlockedPositions) {
        const clean = pos.trim();
        if (clean && !seenUnlocked.has(clean)) {
          seenUnlocked.add(clean);
          unlockedPositions.push(clean);
        }
      }
    }
  }

  const hasAnyStatChange =
    Object.keys(trainingMods).length > 0 || Object.keys(skillMods).length > 0;

  if (!hasAnyStatChange) {
    return {
      baseRating: player.rating,
      rating,
      rank,
      trainingLevel,
      stats: player.stats,
      deltas: {},
      unlockedPositions,
      totalStats: player.totalStats,
    };
  }

  const updatedValues: Record<string, number> = {};
  const deltas: Record<string, number> = {};
  for (const stat of player.stats) {
    if (stat.key.startsWith('avg')) {
      continue;
    }
    const delta = (trainingMods[stat.key] ?? 0) + (skillMods[stat.key] ?? 0);
    const nextValue = stat.value + delta;
    updatedValues[stat.key] = nextValue;
    if (delta !== 0) {
      deltas[stat.key] = delta;
    }
  }

  const computedAvgs = computeAvgStats(updatedValues, player.position);
  for (const [avgKey, avgValue] of Object.entries(computedAvgs)) {
    updatedValues[avgKey] = avgValue;
    const baseAvg = baseByKey[avgKey];
    if (baseAvg !== undefined && avgValue !== baseAvg) {
      deltas[avgKey] = avgValue - baseAvg;
    }
  }

  const nextStats: PlayerStat[] = player.stats.map((stat) => ({
    ...stat,
    value: updatedValues[stat.key] ?? stat.value,
  }));

  const totalStats = Object.entries(updatedValues).reduce(
    (sum, [key, value]) => (key.startsWith('avg') ? sum : sum + value),
    0,
  );

  return {
    baseRating: player.rating,
    rating,
    rank,
    trainingLevel,
    stats: nextStats,
    deltas,
    unlockedPositions,
    totalStats,
  };
}
