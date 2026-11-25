import type { SkillLevel, SkillNode } from '@/lib/domain/player';

/**
 * Official FC Mobile / RenderZ skill display names keyed by `NAME_SKILL_*`.
 * Universal S10 secondary skills (39010–39014 for outfield, 39020–39023 for GK)
 * are shared across cards; each card's primary skill (first node) varies by card.
 */
export const SKILL_NAME_BY_KEY: Readonly<Record<string, string>> = {
  NAME_SKILL_10010: 'Shooting',
  NAME_SKILL_10011: 'Shooting',
  NAME_SKILL_10012: 'Shooting',
  NAME_SKILL_10020: 'Passing',
  NAME_SKILL_10021: 'Passing',
  NAME_SKILL_10022: 'Passing',
  NAME_SKILL_10030: 'Physical',
  NAME_SKILL_10031: 'Physical',
  NAME_SKILL_10032: 'Physical',
  NAME_SKILL_10040: 'Sniper',
  NAME_SKILL_10041: 'Sniper',
  NAME_SKILL_10042: 'Sniper',
  NAME_SKILL_10050: 'False Nine',
  NAME_SKILL_10051: 'False Nine',
  NAME_SKILL_10052: 'False Nine',
  NAME_SKILL_10060: 'Target Man',
  NAME_SKILL_10061: 'Target Man',
  NAME_SKILL_10062: 'Target Man',
  NAME_SKILL_1010: 'Shooting',
  NAME_SKILL_1011: 'Shooting',
  NAME_SKILL_1012: 'Shooting',
  NAME_SKILL_1020: 'Passing',
  NAME_SKILL_1021: 'Passing',
  NAME_SKILL_1022: 'Passing',
  NAME_SKILL_1030: 'Dexterity',
  NAME_SKILL_1031: 'Dexterity',
  NAME_SKILL_1032: 'Dexterity',
  NAME_SKILL_1040: 'Finisher',
  NAME_SKILL_1041: 'Finisher',
  NAME_SKILL_1042: 'Finisher',
  NAME_SKILL_1050: 'Target Man',
  NAME_SKILL_1051: 'Target Man',
  NAME_SKILL_1052: 'Target Man',
  NAME_SKILL_1060: 'Counter',
  NAME_SKILL_1061: 'Counter',
  NAME_SKILL_1062: 'Counter',
  NAME_SKILL_11010: 'Diving',
  NAME_SKILL_11011: 'Diving',
  NAME_SKILL_11012: 'Diving',
  NAME_SKILL_11020: 'GK Passing',
  NAME_SKILL_11021: 'GK Passing',
  NAME_SKILL_11022: 'GK Passing',
  NAME_SKILL_11030: 'Shot Stopper',
  NAME_SKILL_11031: 'Shot Stopper',
  NAME_SKILL_11032: 'Shot Stopper',
  NAME_SKILL_11040: 'Sweeper Keeper',
  NAME_SKILL_11041: 'Sweeper Keeper',
  NAME_SKILL_11042: 'Sweeper Keeper',
  NAME_SKILL_1310: 'Shooting',
  NAME_SKILL_1340: 'Power-Striker',
  NAME_SKILL_20010: 'SHOOTING',
  NAME_SKILL_20020: 'PASSING',
  NAME_SKILL_20030: 'DRIBBLING',
  NAME_SKILL_20040: 'DEXTERITY',
  NAME_SKILL_20050: 'PHYSICAL',
  NAME_SKILL_20060: 'AWARENESS',
  NAME_SKILL_2010: 'Defending',
  NAME_SKILL_2011: 'Defending',
  NAME_SKILL_2012: 'Defending',
  NAME_SKILL_2020: 'Passing',
  NAME_SKILL_2021: 'Passing',
  NAME_SKILL_2022: 'Passing',
  NAME_SKILL_2030: 'Physical',
  NAME_SKILL_2031: 'Physical',
  NAME_SKILL_2032: 'Physical',
  NAME_SKILL_2040: 'Ball-Winning Midfielder',
  NAME_SKILL_2041: 'Ball-Winning Midfielder',
  NAME_SKILL_2042: 'Ball-Winning Midfielder',
  NAME_SKILL_2050: 'Playmaker',
  NAME_SKILL_2051: 'Playmaker',
  NAME_SKILL_2052: 'Playmaker',
  NAME_SKILL_2060: 'Box-To-Box',
  NAME_SKILL_2061: 'Box-To-Box',
  NAME_SKILL_2062: 'Box-To-Box',
  NAME_SKILL_2070: 'Mezzala',
  NAME_SKILL_2080: 'Awareness',
  NAME_SKILL_2090: 'Roaming Midfielder',
  NAME_SKILL_21010: 'PASSING',
  NAME_SKILL_21020: 'DRIBBLING',
  NAME_SKILL_21030: 'DEFENDING',
  NAME_SKILL_21040: 'DEXTERITY',
  NAME_SKILL_21050: 'PHYSICAL',
  NAME_SKILL_21060: 'AWARENESS',
  NAME_SKILL_2510: 'Passing',
  NAME_SKILL_2540: 'Playmaker',
  NAME_SKILL_30010: 'Centre Back',
  NAME_SKILL_30020: 'Defender',
  NAME_SKILL_30030: 'Stopper',
  NAME_SKILL_30040: 'Ball-Playing Defender',
  NAME_SKILL_30050: 'Header',
  NAME_SKILL_30060: 'Physical',
  NAME_SKILL_30070: 'Passing',
  NAME_SKILL_3010: 'Defending',
  NAME_SKILL_3011: 'Defending',
  NAME_SKILL_3012: 'Defending',
  NAME_SKILL_3020: 'Passing',
  NAME_SKILL_3021: 'Passing',
  NAME_SKILL_3022: 'Passing',
  NAME_SKILL_3030: 'Physical',
  NAME_SKILL_3031: 'Physical',
  NAME_SKILL_3032: 'Physical',
  NAME_SKILL_3040: 'No-Nonsense Centre-Back',
  NAME_SKILL_3041: 'No-Nonsense Centre-Back',
  NAME_SKILL_3042: 'No-Nonsense Centre-Back',
  NAME_SKILL_3050: 'Ball-Playing Defender',
  NAME_SKILL_3051: 'Ball-Playing Defender',
  NAME_SKILL_3052: 'Ball-Playing Defender',
  NAME_SKILL_3060: 'Libero',
  NAME_SKILL_3061: 'Libero',
  NAME_SKILL_3062: 'Libero',
  NAME_SKILL_3070: 'Aerial',
  NAME_SKILL_31010: 'Fullback',
  NAME_SKILL_31020: 'Complete Fullback',
  NAME_SKILL_31030: 'Wingback',
  NAME_SKILL_31040: 'Falseback',
  NAME_SKILL_31050: 'Physical',
  NAME_SKILL_31060: 'Dribbling',
  NAME_SKILL_31070: 'Crossing',
  NAME_SKILL_32010: 'Defensive Midfielder',
  NAME_SKILL_32020: 'Holding',
  NAME_SKILL_32030: 'Box-To-Box',
  NAME_SKILL_32040: 'Deep-Lying Playmaker',
  NAME_SKILL_32050: 'Physical',
  NAME_SKILL_32060: 'Defending',
  NAME_SKILL_32070: 'Passing',
  NAME_SKILL_33010: 'Central Midfielder',
  NAME_SKILL_33020: 'Holding',
  NAME_SKILL_33030: 'Box-To-Box',
  NAME_SKILL_33040: 'Deep-Lying Playmaker',
  NAME_SKILL_33050: 'Half-Winger',
  NAME_SKILL_33060: 'Playmaker',
  NAME_SKILL_33070: 'Dribbling',
  NAME_SKILL_33080: 'Awareness',
  NAME_SKILL_33090: 'Physical',
  NAME_SKILL_34010: 'Wide Midfielder',
  NAME_SKILL_34020: 'Wide Playmaker',
  NAME_SKILL_34030: 'Complete Wide Midfielder',
  NAME_SKILL_34040: 'Traditional Winger',
  NAME_SKILL_34050: 'Passing',
  NAME_SKILL_34060: 'Defending',
  NAME_SKILL_34070: 'Physical',
  NAME_SKILL_3410: 'Tackler',
  NAME_SKILL_3440: 'Tackling Marksman',
  NAME_SKILL_35010: 'Attacking Midfielder',
  NAME_SKILL_35020: 'Shadow Striker',
  NAME_SKILL_35030: 'Playmaker',
  NAME_SKILL_35040: 'Half-Winger',
  NAME_SKILL_35050: 'Long Shot',
  NAME_SKILL_35060: 'Dribbling',
  NAME_SKILL_35070: 'Crossing',
  NAME_SKILL_3510: 'Defending',
  NAME_SKILL_3540: 'No-Nonsense Centre-Back',
  NAME_SKILL_36010: 'Winger',
  NAME_SKILL_36020: 'Wide Playmaker',
  NAME_SKILL_36030: 'Traditional Winger',
  NAME_SKILL_36040: 'Inverted Winger',
  NAME_SKILL_36050: 'Dribbling',
  NAME_SKILL_36060: 'Passing',
  NAME_SKILL_36070: 'Shooting',
  NAME_SKILL_37010: 'Striker',
  NAME_SKILL_37020: 'Advance Forward',
  NAME_SKILL_37030: 'Poacher',
  NAME_SKILL_37040: 'Target Forward',
  NAME_SKILL_37050: 'False 9',
  NAME_SKILL_37060: 'Dribbling',
  NAME_SKILL_37070: 'Physical',
  NAME_SKILL_37080: 'Header',
  NAME_SKILL_38010: 'Goal Keeper',
  NAME_SKILL_38020: 'Shot Stopper',
  NAME_SKILL_38030: 'Sweeper Keeper',
  NAME_SKILL_38040: 'GK Passing',
  NAME_SKILL_38050: 'GK Rush',
  NAME_SKILL_38060: 'Highballs',
  NAME_SKILL_39010: 'SCORING',
  NAME_SKILL_39011: 'PASSING',
  NAME_SKILL_39012: 'DRIBBLING',
  NAME_SKILL_39013: 'DEFENDING',
  NAME_SKILL_39014: 'PHYSICAL',
  NAME_SKILL_39020: 'GK KICKING',
  NAME_SKILL_39021: 'GK BALL-PLAYING',
  NAME_SKILL_39022: 'GK RUSH',
  NAME_SKILL_39023: 'HIGHBALLS',
  NAME_SKILL_4010: 'Passing',
  NAME_SKILL_4011: 'Passing',
  NAME_SKILL_4012: 'Passing',
  NAME_SKILL_4020: 'Dribbling',
  NAME_SKILL_4021: 'Dribbling',
  NAME_SKILL_4022: 'Dribbling',
  NAME_SKILL_4030: 'Shooting',
  NAME_SKILL_4031: 'Shooting',
  NAME_SKILL_4032: 'Shooting',
  NAME_SKILL_4040: 'Playmaker',
  NAME_SKILL_4041: 'Playmaker',
  NAME_SKILL_4042: 'Playmaker',
  NAME_SKILL_4050: 'Enganche',
  NAME_SKILL_4051: 'Enganche',
  NAME_SKILL_4052: 'Enganche',
  NAME_SKILL_4060: 'Shadow Striker',
  NAME_SKILL_4061: 'Shadow Striker',
  NAME_SKILL_4062: 'Shadow Striker',
  NAME_SKILL_4070: 'Longshot Taker',
  NAME_SKILL_5010: 'Defending',
  NAME_SKILL_5011: 'Defending',
  NAME_SKILL_5012: 'Defending',
  NAME_SKILL_5020: 'Passing',
  NAME_SKILL_5021: 'Passing',
  NAME_SKILL_5022: 'Passing',
  NAME_SKILL_5030: 'Physical',
  NAME_SKILL_5031: 'Physical',
  NAME_SKILL_5032: 'Physical',
  NAME_SKILL_5040: 'Anchor',
  NAME_SKILL_5041: 'Anchor',
  NAME_SKILL_5042: 'Anchor',
  NAME_SKILL_5050: 'Playmaker',
  NAME_SKILL_5051: 'Playmaker',
  NAME_SKILL_5052: 'Playmaker',
  NAME_SKILL_5060: 'Box-To-Box',
  NAME_SKILL_5061: 'Box-To-Box',
  NAME_SKILL_5062: 'Box-To-Box',
  NAME_SKILL_5310: 'Interceptor',
  NAME_SKILL_5340: 'Intercept-Master',
  NAME_SKILL_6010: 'Passing',
  NAME_SKILL_6011: 'Passing',
  NAME_SKILL_6012: 'Passing',
  NAME_SKILL_6020: 'Dribbling',
  NAME_SKILL_6021: 'Dribbling',
  NAME_SKILL_6022: 'Dribbling',
  NAME_SKILL_6030: 'Balanced',
  NAME_SKILL_6031: 'Balanced',
  NAME_SKILL_6032: 'Balanced',
  NAME_SKILL_6040: 'Playmaker',
  NAME_SKILL_6041: 'Playmaker',
  NAME_SKILL_6042: 'Playmaker',
  NAME_SKILL_6050: 'Wide Target Man',
  NAME_SKILL_6051: 'Wide Target Man',
  NAME_SKILL_6052: 'Wide Target Man',
  NAME_SKILL_6060: 'Wide Midfielder',
  NAME_SKILL_6061: 'Wide Midfielder',
  NAME_SKILL_6062: 'Wide Midfielder',
  NAME_SKILL_7010: 'Defending',
  NAME_SKILL_7011: 'Defending',
  NAME_SKILL_7012: 'Defending',
  NAME_SKILL_7020: 'Passing',
  NAME_SKILL_7021: 'Passing',
  NAME_SKILL_7022: 'Passing',
  NAME_SKILL_7030: 'Balanced',
  NAME_SKILL_7031: 'Balanced',
  NAME_SKILL_7032: 'Balanced',
  NAME_SKILL_7040: 'No-Nonsense Fullback',
  NAME_SKILL_7041: 'No-Nonsense Fullback',
  NAME_SKILL_7042: 'No-Nonsense Fullback',
  NAME_SKILL_7050: 'Attacking Fullback',
  NAME_SKILL_7051: 'Attacking Fullback',
  NAME_SKILL_7052: 'Attacking Fullback',
  NAME_SKILL_7060: 'Fullback',
  NAME_SKILL_7061: 'Fullback',
  NAME_SKILL_7062: 'Fullback',
  NAME_SKILL_7070: 'Tackler',
  NAME_SKILL_8010: 'Passing',
  NAME_SKILL_8011: 'Passing',
  NAME_SKILL_8012: 'Passing',
  NAME_SKILL_8020: 'Dribbling',
  NAME_SKILL_8021: 'Dribbling',
  NAME_SKILL_8022: 'Dribbling',
  NAME_SKILL_8030: 'Balanced',
  NAME_SKILL_8031: 'Balanced',
  NAME_SKILL_8032: 'Balanced',
  NAME_SKILL_8040: 'Wingback',
  NAME_SKILL_8041: 'Wingback',
  NAME_SKILL_8042: 'Wingback',
  NAME_SKILL_8050: 'Inverted Wingback',
  NAME_SKILL_8051: 'Inverted Wingback',
  NAME_SKILL_8052: 'Inverted Wingback',
  NAME_SKILL_8060: 'Complete Wingback',
  NAME_SKILL_8061: 'Complete Wingback',
  NAME_SKILL_8062: 'Complete Wingback',
  NAME_SKILL_9010: 'Passing',
  NAME_SKILL_9011: 'Passing',
  NAME_SKILL_9012: 'Passing',
  NAME_SKILL_9020: 'Dexterity',
  NAME_SKILL_9021: 'Dexterity',
  NAME_SKILL_9022: 'Dexterity',
  NAME_SKILL_9030: 'Dribbling',
  NAME_SKILL_9031: 'Dribbling',
  NAME_SKILL_9032: 'Dribbling',
  NAME_SKILL_9040: 'Playmaker',
  NAME_SKILL_9041: 'Playmaker',
  NAME_SKILL_9042: 'Playmaker',
  NAME_SKILL_9050: 'Raumdeuter',
  NAME_SKILL_9051: 'Raumdeuter',
  NAME_SKILL_9052: 'Raumdeuter',
  NAME_SKILL_9060: 'Inverted Winger',
  NAME_SKILL_9061: 'Inverted Winger',
  NAME_SKILL_9062: 'Inverted Winger',
  NAME_SKILL_9070: 'Runner',
  NAME_SKILL_9410: 'Dribbling',
  NAME_SKILL_9440: 'Wing-Wizard',
};

/**
 * Fallback modifiers for the 5 universal S10 outfield secondary skills
 * (39010 SCORING, 39011 PASSING, 39012 DRIBBLING, 39013 DEFENDING, 39014 PHYSICAL)
 * when an older un-enriched catalog row only carries skill ids/keys.
 */
export const UNIVERSAL_S10_SECONDARY_LEVELS: Readonly<
  Record<string, readonly SkillLevel[]>
> = {
  '39010': [
    {
      level: 1,
      unlockedPositions: [],
      abilityModifiers: { hea: 20, fin: 20, sho: 20, lsa: 20 },
    },
  ],
  '39011': [
    {
      level: 1,
      unlockedPositions: [],
      abilityModifiers: { cro: 20, lpa: 20, spa: 20, vis: 20 },
    },
  ],
  '39012': [
    {
      level: 1,
      unlockedPositions: [],
      abilityModifiers: { bac: 20, dri: 20, rea: 20, agi: 20 },
    },
  ],
  '39013': [
    {
      level: 1,
      unlockedPositions: [],
      abilityModifiers: { awr: 20, mrk: 20, stt: 20, slt: 20 },
    },
  ],
  '39014': [
    {
      level: 1,
      unlockedPositions: [],
      abilityModifiers: { agg: 20, str: 20, bal: 20, jmp: 20 },
    },
  ],
};

export function resolveSkillName(skill: {
  id: string;
  key?: string;
  name?: string;
}): string {
  const cleanName = skill.name?.trim();
  if (cleanName && !/^NAME_SKILL_/i.test(cleanName)) {
    return cleanName;
  }
  const byKey = skill.key ? SKILL_NAME_BY_KEY[skill.key] : undefined;
  if (byKey) {
    return byKey;
  }
  const byNameKey = cleanName ? SKILL_NAME_BY_KEY[cleanName] : undefined;
  if (byNameKey) {
    return byNameKey;
  }
  const byIdKey = SKILL_NAME_BY_KEY[`NAME_SKILL_${skill.id}`];
  if (byIdKey) {
    return byIdKey;
  }
  return cleanName || skill.key || `Skill ${skill.id}`;
}

/**
 * Normalize parsed skills so every node has a resolved name and—for legacy rows
 * that only stored `{ id, key }`—still attaches the universal S10 secondary
 * levels & requirement if missing.
 */
export function normalizePlayerSkills(skills: readonly SkillNode[]): SkillNode[] {
  const firstId = skills[0]?.id;
  return skills.map((skill, index) => {
    const fallbackLevels =
      !skill.levels || skill.levels.length === 0
        ? UNIVERSAL_S10_SECONDARY_LEVELS[skill.id]
        : undefined;
    const levels =
      skill.levels && skill.levels.length > 0
        ? skill.levels
        : fallbackLevels
          ? fallbackLevels.map((lvl) => ({
              ...lvl,
              unlockedPositions: [...lvl.unlockedPositions],
              abilityModifiers: { ...lvl.abilityModifiers },
            }))
          : undefined;
    const requirement =
      skill.requirement !== undefined
        ? skill.requirement
        : fallbackLevels && index > 0 && firstId && firstId !== skill.id
          ? { skillId: firstId, level: 2 }
          : undefined;
    return {
      ...skill,
      name: resolveSkillName(skill),
      ...(levels ? { levels } : {}),
      ...(requirement !== undefined ? { requirement } : {}),
    };
  });
}
