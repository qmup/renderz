import { describe, expect, it } from "vitest";
import {
  programEventLabel,
  programEventOrder,
  programLogoSrc,
  sortProgramFacets,
} from "@/lib/catalog/programs";

describe("programEventLabel", () => {
  it("uses RenderZ event names for known PROGRAM_* ids", () => {
    expect(programEventLabel("PROGRAM_NUMERO26")).toBe("Numero");
    expect(programEventLabel("PROGRAM_GC26")).toBe("Game Changer");
    expect(programEventLabel("PROGRAM_RTAC26")).toBe("Road to AFC");
    expect(programEventLabel("PROGRAM_CHAMPIONS26")).toBe("Champions");
    expect(programEventLabel("PROGRAM_SUMMERSPECIAL")).toBe("Summer Special");
    expect(programEventLabel("PROGRAM_RECORDHOLDERS")).toBe("Record Holders");
    expect(programEventLabel("PROGRAM_TWG26")).toBe("The World's Game 26");
    expect(programEventLabel("PROGRAM_TOTY26")).toBe("TOTY 26");
    expect(programEventLabel("PROGRAM_ICONS")).toBe("Icons");
    expect(programEventLabel("PROGRAM_HEROS8")).toBe("Heroes");
    expect(programEventLabel("PROGRAM_MOMENT25")).toBe("Moments");
  });
});

describe("programLogoSrc", () => {
  it("maps catalog aliases to origin-served logo paths", () => {
    expect(programLogoSrc("PROGRAM_NUMERO26")).toBe("/program-logos/NUMERO26.png");
    expect(programLogoSrc("PROGRAM_GC26")).toBe("/program-logos/GC26.png");
    expect(programLogoSrc("PROGRAM_RECORDHOLDERS")).toBe(
      "/program-logos/RECORDHOLDERS26.png",
    );
    expect(programLogoSrc("FUTURESTARS")).toBe("/program-logos/FS26.png");
    expect(programLogoSrc("PROGRAM_RAMADAN")).toBe("/program-logos/RA26.png");
    expect(programLogoSrc("GINGA")).toBe("/program-logos/GINGA26.png");
    expect(programLogoSrc("FLASHBACK")).toBe("/program-logos/FLASHBACK26.png");
    expect(programLogoSrc("TOPDUOS")).toBe("/program-logos/TOPDUOS26.png");
    expect(programLogoSrc("RECORDBREAKERS")).toBe("/program-logos/RB26.png");
    expect(programLogoSrc("HOLIDAY")).toBe("/program-logos/WINTERHOLIDAY26.png");
    expect(programLogoSrc("FESTIVEFIXTURES")).toBe("/program-logos/EPL26_FF.png");
    expect(programLogoSrc("CAPPEDLEGENDS")).toBe(
      "/program-logos/CAPPED_LEGENDS_26.png",
    );
    expect(programLogoSrc("PROGRAM_ICONS")).toBe("/program-logos/ICONS.png");
    expect(programLogoSrc("PROGRAM_HEROS8")).toBe("/program-logos/HEROS8.png");
    expect(programLogoSrc("PROGRAM_MOMENT25")).toBe("/program-logos/MOMENT25.png");
    expect(programLogoSrc("SONGKRAN")).toBe("/program-logos/SONGKRAN26.png");
  });

  it("falls back to an allowlisted PROGRAM_ slug when unknown", () => {
    expect(programLogoSrc("PROGRAM_NEWPROMO26")).toBe(
      "/program-logos/NEWPROMO26.png",
    );
    expect(programLogoSrc("PROGRAM_bad-slug")).toBeUndefined();
    expect(programLogoSrc("../etc/passwd")).toBeUndefined();
  });
});

describe("sortProgramFacets", () => {
  it("orders like the RenderZ Program / Event list (newest first)", () => {
    const sorted = sortProgramFacets([
      { value: "PROGRAM_TWG26", count: 800 },
      { value: "PROGRAM_NUMERO26", count: 50 },
      { value: "PROGRAM_CHAMPIONS26", count: 200 },
      { value: "PROGRAM_GC26", count: 40 },
    ]);
    expect(sorted.map((row) => row.value)).toEqual([
      "PROGRAM_NUMERO26",
      "PROGRAM_GC26",
      "PROGRAM_CHAMPIONS26",
      "PROGRAM_TWG26",
    ]);
    expect(programEventOrder("PROGRAM_NUMERO26")).toBeLessThan(
      programEventOrder("PROGRAM_TWG26"),
    );
  });
});
