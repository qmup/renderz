import { describe, expect, it } from "vitest";
import {
  formatProgramFacetLabel,
  PLAYER_SORT_OPTIONS,
  POSITION_GROUPS,
  positionFilterGroups,
  toggleListValue,
} from "@/components/players/player-filter-shared";

describe("player-filter-shared", () => {
  it("lists newest added as the default sort option", () => {
    expect(PLAYER_SORT_OPTIONS[0]).toEqual({
      value: "added_desc",
      label: "Newest added",
    });
  });

  it("toggles facet values", () => {
    expect(toggleListValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleListValue(["a", "b"], "a")).toEqual(["b"]);
  });

  it("humanizes PROGRAM_ ids", () => {
    expect(formatProgramFacetLabel("PROGRAM_TOTY26")).toBe("TOTY 26");
    expect(formatProgramFacetLabel("CHAMPIONS26")).toBe("Champions");
  });

  it("groups positions in RenderZ attack / midfield / defence order", () => {
    expect(POSITION_GROUPS.map((group) => [group.label, group.positions])).toEqual([
      ["ATTACK", ["RW", "RF", "CF", "ST", "LF", "LW"]],
      ["MIDFIELD", ["RM", "CM", "CDM", "CAM", "LM"]],
      ["DEFENCE", ["GK", "RWB", "RB", "CB", "LB", "LWB"]],
    ]);
  });

  it("appends unknown facet positions in an OTHER group", () => {
    const groups = positionFilterGroups(["ST", "SW", "ST"]);
    expect(groups.at(-1)).toEqual({ label: "OTHER", positions: ["SW"] });
  });
});
