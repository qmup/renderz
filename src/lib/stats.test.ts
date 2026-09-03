import { describe, expect, it } from "vitest";
import { groupDetailStats, groupStatsFromPlayerStats } from "@/lib/stats";

/** Catalog snapshot of Raphaël Varane 30920624 (122 CB). */
const VARANE_STATS = [
  { key: "avg1", value: 145 },
  { key: "avg2", value: 107 },
  { key: "avg3", value: 129 },
  { key: "avg4", value: 138 },
  { key: "avg5", value: 158 },
  { key: "avg6", value: 150 },
  { key: "acc", value: 146 },
  { key: "agg", value: 143 },
  { key: "agi", value: 137 },
  { key: "awr", value: 159 },
  { key: "bac", value: 142 },
  { key: "bal", value: 138 },
  { key: "cro", value: 111 },
  { key: "cur", value: 107 },
  { key: "dri", value: 133 },
  { key: "fin", value: 102 },
  { key: "frk", value: 102 },
  { key: "gkd", value: 8 },
  { key: "hea", value: 157 },
  { key: "jmp", value: 150 },
  { key: "lpa", value: 137 },
  { key: "lsa", value: 98 },
  { key: "mrk", value: 160 },
  { key: "pen", value: 102 },
  { key: "pos", value: 132 },
  { key: "rea", value: 142 },
  { key: "sho", value: 112 },
  { key: "slt", value: 158 },
  { key: "spa", value: 143 },
  { key: "spd", value: 145 },
  { key: "str", value: 155 },
  { key: "stt", value: 160 },
  { key: "vis", value: 129 },
  { key: "vol", value: 96 },
  { key: "sta", value: 71 },
];

/** Catalog snapshot of Victor Osimhen 24048401 (122 ST). */
const OSIMHEN_STATS = [
  { key: "avg1", value: 158 },
  { key: "avg2", value: 156 },
  { key: "avg3", value: 134 },
  { key: "avg4", value: 150 },
  { key: "avg5", value: 91 },
  { key: "avg6", value: 150 },
  { key: "acc", value: 159 },
  { key: "agg", value: 140 },
  { key: "agi", value: 147 },
  { key: "awr", value: 74 },
  { key: "bac", value: 153 },
  { key: "bal", value: 144 },
  { key: "cro", value: 127 },
  { key: "cur", value: 138 },
  { key: "dri", value: 152 },
  { key: "fin", value: 160 },
  { key: "frk", value: 111 },
  { key: "hea", value: 153 },
  { key: "jmp", value: 156 },
  { key: "lpa", value: 121 },
  { key: "lsa", value: 152 },
  { key: "mrk", value: 74 },
  { key: "pen", value: 156 },
  { key: "pos", value: 155 },
  { key: "rea", value: 152 },
  { key: "sho", value: 157 },
  { key: "slt", value: 74 },
  { key: "spa", value: 144 },
  { key: "spd", value: 158 },
  { key: "str", value: 154 },
  { key: "stt", value: 100 },
  { key: "vis", value: 143 },
  { key: "vol", value: 158 },
  { key: "sta", value: 81 },
];

describe("groupStatsFromPlayerStats", () => {
  it("maps avg1..avg6 to PAC SHO PAS DRI DEF PHY", () => {
    const grouped = groupStatsFromPlayerStats([
      { key: "avg1", value: 158 },
      { key: "avg2", value: 156 },
      { key: "avg3", value: 134 },
      { key: "avg4", value: 150 },
      { key: "avg5", value: 91 },
      { key: "avg6", value: 150 },
      { key: "acc", value: 159 },
    ]);
    expect(grouped.map((stat) => [stat.label, stat.value])).toEqual([
      ["PAC", 158],
      ["SHO", 156],
      ["PAS", 134],
      ["DRI", 150],
      ["DEF", 91],
      ["PHY", 150],
    ]);
  });
});

describe("groupDetailStats", () => {
  it("nests RenderZ sub-stats under PAC–PHY for Varane", () => {
    const groups = groupDetailStats(VARANE_STATS);
    expect(groups.map((group) => [group.label, group.value, group.children.map((c) => c.key)])).toEqual([
      ["PAC", 145, ["acc", "spd"]],
      ["SHO", 107, ["fin", "lsa", "sho", "pos", "vol", "pen"]],
      ["PAS", 129, ["spa", "lpa", "vis", "cro", "cur", "frk"]],
      ["DRI", 138, ["dri", "bal", "agi", "rea", "bac"]],
      ["DEF", 158, ["mrk", "stt", "slt", "awr", "hea"]],
      ["PHY", 150, ["str", "agg", "jmp"]],
    ]);
    expect(groups.find((group) => group.name === "Pace")?.children).toEqual([
      { key: "acc", label: "Acceleration", value: 146 },
      { key: "spd", label: "Sprint Speed", value: 145 },
    ]);
    expect(groups.flatMap((group) => group.children.map((child) => child.key))).not.toContain("sta");
  });

  it("uses the same grouping for an Osimhen-style attacker", () => {
    const groups = groupDetailStats(OSIMHEN_STATS);
    expect(groups.find((group) => group.label === "SHO")?.children.map((c) => [c.key, c.value])).toEqual([
      ["fin", 160],
      ["lsa", 152],
      ["sho", 157],
      ["pos", 155],
      ["vol", 158],
      ["pen", 156],
    ]);
    expect(groups.find((group) => group.label === "PHY")?.children.map((c) => c.key)).toEqual([
      "str",
      "agg",
      "jmp",
    ]);
  });
});
