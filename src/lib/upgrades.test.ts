import { describe, expect, it } from 'vitest';
import type { Player, SkillNode } from '@/lib/domain/player';
import {
  INITIAL_UPGRADE_STATE,
  clampRank,
  computeUpgradedPlayer,
  getSkillStates,
  normalizeTrainingLevel,
  remainingSkillPoints,
  selectRankState,
  selectTrainingState,
  toggleSkillToMax,
  toggleSkillUpgrade,
} from '@/lib/upgrades';

const ESSIEN_SKILLS: SkillNode[] = [
  {
    id: '32021',
    key: 'NAME_SKILL_32020',
    name: 'Holding',
    requirement: null,
    levels: [
      {
        level: 1,
        unlockedPositions: [],
        abilityModifiers: {
          acc: 10, agg: 10, awr: 10, mrk: 10, spd: 10, spa: 10, str: 10, stt: 10,
        },
      },
      {
        level: 2,
        unlockedPositions: [],
        abilityModifiers: {
          acc: 20, agg: 20, awr: 20, mrk: 20, spd: 20, spa: 20, str: 20, stt: 20,
        },
      },
    ],
  },
  {
    id: '39010',
    key: 'NAME_SKILL_39010',
    name: 'SCORING',
    requirement: { skillId: '32021', level: 2 },
    levels: [
      {
        level: 1,
        unlockedPositions: ['CM'],
        abilityModifiers: { hea: 20, fin: 20, sho: 20, lsa: 20 },
      },
    ],
  },
  {
    id: '39011',
    key: 'NAME_SKILL_39011',
    name: 'PASSING',
    requirement: { skillId: '32021', level: 2 },
    levels: [
      {
        level: 1,
        unlockedPositions: ['CM'],
        abilityModifiers: { cro: 20, lpa: 20, spa: 20, vis: 20 },
      },
    ],
  },
  {
    id: '39012',
    key: 'NAME_SKILL_39012',
    name: 'DRIBBLING',
    requirement: { skillId: '32021', level: 2 },
    levels: [
      {
        level: 1,
        unlockedPositions: ['CM'],
        abilityModifiers: { bac: 20, dri: 20, rea: 20, agi: 20 },
      },
    ],
  },
  {
    id: '39013',
    key: 'NAME_SKILL_39013',
    name: 'DEFENDING',
    requirement: { skillId: '32021', level: 2 },
    levels: [
      {
        level: 1,
        unlockedPositions: ['CM'],
        abilityModifiers: { awr: 20, mrk: 20, stt: 20, slt: 20 },
      },
    ],
  },
  {
    id: '39014',
    key: 'NAME_SKILL_39014',
    name: 'PHYSICAL',
    requirement: { skillId: '32021', level: 2 },
    levels: [
      {
        level: 1,
        unlockedPositions: ['CM'],
        abilityModifiers: { agg: 20, str: 20, bal: 20, jmp: 20 },
      },
    ],
  },
];

/** Live RenderZ snapshot of Michaël Essien 30924201 (124 CDM). */
const ESSIEN: Pick<
  Player,
  'rating' | 'position' | 'stats' | 'skills' | 'totalStats'
> = {
  rating: 124,
  position: 'CDM',
  totalStats: 3912,
  skills: ESSIEN_SKILLS,
  stats: [
    { key: 'avg1', value: 147 },
    { key: 'avg2', value: 131 },
    { key: 'avg3', value: 136 },
    { key: 'avg4', value: 144 },
    { key: 'avg5', value: 153 },
    { key: 'avg6', value: 151 },
    { key: 'acc', value: 146 },
    { key: 'spd', value: 148 },
    { key: 'fin', value: 104 },
    { key: 'lsa', value: 155 },
    { key: 'sho', value: 153 },
    { key: 'pos', value: 142 },
    { key: 'vol', value: 130 },
    { key: 'pen', value: 105 },
    { key: 'spa', value: 152 },
    { key: 'lpa', value: 148 },
    { key: 'vis', value: 137 },
    { key: 'cro', value: 109 },
    { key: 'cur', value: 103 },
    { key: 'frk', value: 107 },
    { key: 'dri', value: 138 },
    { key: 'bal', value: 150 },
    { key: 'agi', value: 138 },
    { key: 'rea', value: 151 },
    { key: 'bac', value: 152 },
    { key: 'mrk', value: 156 },
    { key: 'stt', value: 158 },
    { key: 'slt', value: 152 },
    { key: 'awr', value: 159 },
    { key: 'hea', value: 138 },
    { key: 'str', value: 156 },
    { key: 'agg', value: 155 },
    { key: 'jmp', value: 141 },
    { key: 'sta', value: 89 },
  ],
};

function statMap(stats: ReadonlyArray<{ key: string; value: number }>) {
  return Object.fromEntries(stats.map((s) => [s.key, s.value]));
}

describe('rank and training state helpers', () => {
  it('clamps rank strictly to 0..6 and training strictly to 0 or 30', () => {
    expect(clampRank(-2)).toBe(0);
    expect(clampRank(0)).toBe(0);
    expect(clampRank(6)).toBe(6);
    expect(clampRank(9)).toBe(6);

    expect(normalizeTrainingLevel(0)).toBe(0);
    expect(normalizeTrainingLevel(15)).toBe(0);
    expect(normalizeTrainingLevel(29)).toBe(0);
    expect(normalizeTrainingLevel(30)).toBe(30);
    expect(normalizeTrainingLevel(40)).toBe(30);
  });

  it('resets skills when lowering rank below spent points', () => {
    const withSkills = {
      rank: 4 as const,
      trainingLevel: 30 as const,
      skillUpgrades: [
        { id: '32021', level: 2 },
        { id: '39013', level: 1 },
      ],
    };
    expect(selectRankState(withSkills, 3).skillUpgrades).toHaveLength(2);
    expect(selectRankState(withSkills, 2).skillUpgrades).toEqual([]);
    expect(selectRankState(withSkills, 0)).toEqual({
      rank: 0,
      trainingLevel: 30,
      skillUpgrades: [],
    });
    expect(selectTrainingState(withSkills, 0).trainingLevel).toBe(0);
  });
});

describe('computeUpgradedPlayer — Essien (30924201) exact RenderZ parity', () => {
  it('keeps stats unchanged at rank 5/6 with training 0 and no skills, only raising OVR', () => {
    const r5 = computeUpgradedPlayer(ESSIEN, {
      ...INITIAL_UPGRADE_STATE,
      rank: 5,
    });
    expect(r5.rating).toBe(129);
    expect(r5.deltas).toEqual({});
    expect(statMap(r5.stats).avg1).toBe(147);

    const r6 = computeUpgradedPlayer(ESSIEN, {
      ...INITIAL_UPGRADE_STATE,
      rank: 6,
    });
    expect(r6.rating).toBe(130);
    expect(r6.deltas).toEqual({});
  });

  it('matches RenderZ Training Level 30 stats for CDM', () => {
    const t30 = computeUpgradedPlayer(ESSIEN, {
      rank: 6,
      trainingLevel: 30,
      skillUpgrades: [],
    });
    const m = statMap(t30.stats);
    expect(t30.rating).toBe(130);
    expect(m.avg1).toBe(168);
    expect(m.avg2).toBe(143);
    expect(m.avg3).toBe(162);
    expect(m.avg4).toBe(170);
    expect(m.avg5).toBe(186);
    expect(m.avg6).toBe(179);
    expect(m.acc).toBe(170);
    expect(m.spd).toBe(166);
    expect(m.spa).toBe(188);
    expect(m.lpa).toBe(184);
    expect(m.mrk).toBe(192);
    expect(m.stt).toBe(194);
    expect(m.slt).toBe(188);
    expect(m.awr).toBe(195);
    expect(m.str).toBe(192);
    expect(m.agg).toBe(179);
    expect(m.jmp).toBe(159);
    expect(m.sta).toBe(89);
  });

  it('matches RenderZ stats for Training 30 + Holding LVL2 + DEFENDING LVL1 + PHYSICAL LVL1', () => {
    const step1 = computeUpgradedPlayer(ESSIEN, {
      rank: 6,
      trainingLevel: 30,
      skillUpgrades: [
        { id: '32021', level: 2 },
        { id: '39013', level: 1 },
      ],
    });
    const m1 = statMap(step1.stats);
    expect(m1.avg1).toBe(188);
    expect(m1.avg2).toBe(143);
    expect(m1.avg3).toBe(168);
    expect(m1.avg4).toBe(170);
    expect(m1.avg5).toBe(216);
    expect(m1.avg6).toBe(194);
    expect(m1.awr).toBe(235);
    expect(step1.unlockedPositions).toEqual(['CM']);

    const step2 = computeUpgradedPlayer(ESSIEN, {
      rank: 6,
      trainingLevel: 30,
      skillUpgrades: [
        { id: '32021', level: 2 },
        { id: '39013', level: 1 },
        { id: '39014', level: 1 },
      ],
    });
    const m2 = statMap(step2.stats);
    expect(m2.avg4).toBe(172);
    expect(m2.bal).toBe(194);
    expect(m2.avg6).toBe(214);
    expect(m2.str).toBe(232);
    expect(m2.agg).toBe(219);
    expect(m2.jmp).toBe(179);
  });
});

describe('skill tree unlocking and card-specific primary skills', () => {
  it('locks secondary skills until the card-specific primary skill reaches LVL2 and cascades removal', () => {
    // At rank 0, everything is locked
    const atRank0 = getSkillStates(ESSIEN_SKILLS, [], 0);
    expect(atRank0.every((s) => s.isDisabled)).toBe(true);

    // At rank 2, Holding LVL1 & LVL2 are available; secondary skills still locked
    const atRank2 = getSkillStates(ESSIEN_SKILLS, [], 2);
    expect(atRank2[0]?.isDisabled).toBe(false);
    expect(atRank2[1]?.isRequirementMet).toBe(false);

    // Upgrade Holding -> LVL1 (1 SP left), then directly LVL1 -> LVL2 (0 SP left)
    const u1 = toggleSkillUpgrade(ESSIEN_SKILLS, [], '32021', 1, 3);
    expect(remainingSkillPoints(3, u1)).toBe(2);
    const u2 = toggleSkillUpgrade(ESSIEN_SKILLS, u1, '32021', 2, 3);
    expect(remainingSkillPoints(3, u2)).toBe(1);

    // Now DEFENDING (39013) is unlocked and selectable
    const statesAfterPrimary = getSkillStates(ESSIEN_SKILLS, u2, 3);
    expect(statesAfterPrimary.find((s) => s.id === '39013')?.isRequirementMet).toBe(true);
    const u3 = toggleSkillUpgrade(ESSIEN_SKILLS, u2, '39013', 1, 3);
    expect(remainingSkillPoints(3, u3)).toBe(0);

    // Removing Holding LVL2 cascades and removes DEFENDING too
    const uCleared = toggleSkillUpgrade(ESSIEN_SKILLS, u3, '32021', 2, 3);
    expect(uCleared).toEqual([]);
  });

  it('toggleSkillToMax jumps directly to max affordable level and toggles off on second click', () => {
    // At rank 1, Holding jumps to LVL 1 (max affordable)
    const r1 = toggleSkillToMax(ESSIEN_SKILLS, [], '32021', 1);
    expect(r1).toEqual([{ id: '32021', level: 1 }]);
    // After raising to rank 3, clicking Holding again bumps LVL 1 -> LVL 2
    const r3Up = toggleSkillToMax(ESSIEN_SKILLS, r1, '32021', 3);
    expect(r3Up).toEqual([{ id: '32021', level: 2 }]);
    // At rank 6 from scratch, one click jumps straight to LVL 2
    const r6Max = toggleSkillToMax(ESSIEN_SKILLS, [], '32021', 6);
    expect(r6Max).toEqual([{ id: '32021', level: 2 }]);
    // Clicking DEFENDING jumps to LVL 1
    const withDef = toggleSkillToMax(ESSIEN_SKILLS, r6Max, '39013', 6);
    expect(withDef).toEqual([
      { id: '32021', level: 2 },
      { id: '39013', level: 1 },
    ]);
    // Clicking Holding again when already max clears it and cascades DEFENDING
    const cleared = toggleSkillToMax(ESSIEN_SKILLS, withDef, '32021', 6);
    expect(cleared).toEqual([]);
  });

  it('hydrates legacy DB rows that only store skill id and key from the static skill catalog', () => {
    const legacySkills: SkillNode[] = [
      { id: '37031', key: 'NAME_SKILL_37030' },
      { id: '39010', key: 'NAME_SKILL_39010' },
      { id: '39013', key: 'NAME_SKILL_39013' },
    ];
    const atRank6 = getSkillStates(legacySkills, [], 6);
    expect(atRank6[0]?.name).toBe('Poacher');
    expect(atRank6[0]?.hasLevels).toBe(true);
    expect(atRank6[0]?.isDisabled).toBe(false);
    expect(atRank6[1]?.requirement).toEqual({
      skillId: '37031',
      level: 2,
      skillName: 'Poacher',
    });
    const upgraded = toggleSkillToMax(legacySkills, [], '37031', 6);
    expect(upgraded).toEqual([{ id: '37031', level: 2 }]);
    const withScoring = toggleSkillToMax(legacySkills, upgraded, '39010', 6);
    expect(withScoring).toEqual([
      { id: '37031', level: 2 },
      { id: '39010', level: 1 },
    ]);
  });

  it('supports different card-specific primary skills (e.g. Inverted Winger for LW)', () => {
    const mbappeSkills: SkillNode[] = [
      {
        id: '36041',
        key: 'NAME_SKILL_36040',
        requirement: null,
        levels: [
          {
            level: 1,
            unlockedPositions: [],
            abilityModifiers: { acc: 10, spd: 10, dri: 10, fin: 10 },
          },
          {
            level: 2,
            unlockedPositions: [],
            abilityModifiers: { acc: 20, spd: 20, dri: 20, fin: 20 },
          },
        ],
      },
      {
        id: '39010',
        key: 'NAME_SKILL_39010',
        requirement: { skillId: '36041', level: 2 },
        levels: [
          {
            level: 1,
            unlockedPositions: ['ST'],
            abilityModifiers: { hea: 20, fin: 20, sho: 20, lsa: 20 },
          },
        ],
      },
    ];
    const states = getSkillStates(mbappeSkills, [], 3);
    expect(states[0]?.name).toBe('Inverted Winger');
    expect(states[1]?.name).toBe('SCORING');
    expect(states[1]?.requirement?.skillName).toBe('Inverted Winger');
  });

  it('computes GK avgStats and training level 30 properly', () => {
    const gk: Pick<Player, 'rating' | 'position' | 'stats' | 'skills'> = {
      rating: 120,
      position: 'GK',
      skills: [],
      stats: [
        { key: 'avg1', value: 140 },
        { key: 'avg2', value: 138 },
        { key: 'avg3', value: 136 },
        { key: 'avg4', value: 142 },
        { key: 'avg5', value: 130 },
        { key: 'avg6', value: 120 },
        { key: 'gkd', value: 140 },
        { key: 'gkp', value: 138 },
        { key: 'han', value: 136 },
        { key: 'ref', value: 142 },
        { key: 'gkk', value: 130 },
        { key: 'rea', value: 130 },
        { key: 'agi', value: 110 },
        { key: 'spd', value: 90 },
        { key: 'str', value: 100 },
      ],
    };
    const result = computeUpgradedPlayer(gk, {
      rank: 5,
      trainingLevel: 30,
      skillUpgrades: [],
    });
    const m = statMap(result.stats);
    expect(result.rating).toBe(125);
    expect(m.avg1).toBe(176);
    expect(m.avg2).toBe(174);
    expect(m.avg3).toBe(172);
    expect(m.avg4).toBe(178);
    expect(m.avg5).toBe(166);
    // rea: (130+36)*65 + agi: (110+36)*15 + spd: (90+18)*10 + str: (100+24)*10 = 10790+2190+1080+1240 = 15300 -> 153
    expect(m.avg6).toBe(153);
  });
});
