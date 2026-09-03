import type { PlayerStat } from "@/lib/domain/player";

/** FIFA Mobile / RenderZ listing order. Confirmed against public cards (e.g. Osimhen). */
export const GROUP_STAT_ORDER = [
  { key: "avg1", label: "PAC" },
  { key: "avg2", label: "SHO" },
  { key: "avg3", label: "PAS" },
  { key: "avg4", label: "DRI" },
  { key: "avg5", label: "DEF" },
  { key: "avg6", label: "PHY" },
] as const;

/**
 * Sub-stats under each PAC–PHY group, in the order RenderZ shows on player
 * detail (Pace / Shooting / Passing / Dribbling / Defending / Physical).
 * Taken from public RenderZ player pages (e.g. Sané, De Bruyne); Physical
 * lists Strength, Aggression, Jumping and not Stamina.
 */
export const DETAIL_STAT_GROUPS = [
  {
    key: "avg1",
    label: "PAC",
    name: "Pace",
    children: [
      { key: "acc", label: "Acceleration" },
      { key: "spd", label: "Sprint Speed" },
    ],
  },
  {
    key: "avg2",
    label: "SHO",
    name: "Shooting",
    children: [
      { key: "fin", label: "Finishing" },
      { key: "lsa", label: "Long Shot" },
      { key: "sho", label: "Shot Power" },
      { key: "pos", label: "Positioning" },
      { key: "vol", label: "Volley" },
      { key: "pen", label: "Penalties" },
    ],
  },
  {
    key: "avg3",
    label: "PAS",
    name: "Passing",
    children: [
      { key: "spa", label: "Short Passing" },
      { key: "lpa", label: "Long Passing" },
      { key: "vis", label: "Vision" },
      { key: "cro", label: "Crossing" },
      { key: "cur", label: "Curve" },
      { key: "frk", label: "Free Kick" },
    ],
  },
  {
    key: "avg4",
    label: "DRI",
    name: "Dribbling",
    children: [
      { key: "dri", label: "Dribbling" },
      { key: "bal", label: "Balance" },
      { key: "agi", label: "Agility" },
      { key: "rea", label: "Reactions" },
      { key: "bac", label: "Ball Control" },
    ],
  },
  {
    key: "avg5",
    label: "DEF",
    name: "Defending",
    children: [
      { key: "mrk", label: "Marking" },
      { key: "stt", label: "Standing Tackle" },
      { key: "slt", label: "Sliding Tackle" },
      { key: "awr", label: "Awareness" },
      { key: "hea", label: "Heading" },
    ],
  },
  {
    key: "avg6",
    label: "PHY",
    name: "Physical",
    children: [
      { key: "str", label: "Strength" },
      { key: "agg", label: "Aggression" },
      { key: "jmp", label: "Jumping" },
    ],
  },
] as const;

export type GroupStat = {
  key: string;
  label: string;
  value: number;
};

export type DetailStatChild = {
  key: string;
  label: string;
  value: number;
};

export type DetailStatGroup = {
  key: string;
  label: string;
  name: string;
  value: number;
  children: DetailStatChild[];
};

export function groupStatsFromPlayerStats(stats: PlayerStat[]): GroupStat[] {
  const byKey = new Map(stats.map((stat) => [stat.key, stat]));
  return GROUP_STAT_ORDER.flatMap((group) => {
    const stat = byKey.get(group.key);
    if (!stat) {
      return [];
    }
    return [{ key: group.key, label: stat.label ?? group.label, value: stat.value }];
  });
}

export function groupDetailStats(stats: PlayerStat[]): DetailStatGroup[] {
  const byKey = new Map(stats.map((stat) => [stat.key, stat]));
  return DETAIL_STAT_GROUPS.flatMap((group) => {
    const header = byKey.get(group.key);
    if (!header) {
      return [];
    }
    const children = group.children.flatMap((child) => {
      const stat = byKey.get(child.key);
      if (!stat) {
        return [];
      }
      return [{ key: child.key, label: child.label, value: stat.value }];
    });
    return [
      {
        key: group.key,
        label: group.label,
        name: group.name,
        value: header.value,
        children,
      },
    ];
  });
}
