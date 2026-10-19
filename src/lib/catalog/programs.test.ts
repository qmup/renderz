import { describe, expect, it } from "vitest";
import {
  catalogProgramLogoSlugs,
  programEventLabel,
  programEventOrder,
  programLogoSlug,
  programLogoSrc,
  programLogoUpstreamUrl,
  sortProgramFacets,
  unknownProgramLogoSlug,
} from "@/lib/catalog/programs";

describe("programEventLabel", () => {
  it("uses RenderZ event names for known PROGRAM_* ids", () => {
    expect(programEventLabel("PROGRAM_TOTW27")).toBe("Team of the Week");
    expect(programEventLabel("PROGRAM_UB27")).toBe("Unbreakable");
    expect(programEventLabel("PROGRAM_HOFS")).toBe("Classics");
    expect(programEventLabel("PROGRAM_ANN27")).toBe("3rd Anniversary");
    expect(programEventLabel("PROGRAM_NUMERO26")).toBe("Numero");
    expect(programEventLabel("PROGRAM_GC26")).toBe("Game Changer");
    expect(programEventLabel("PROGRAM_RTAC26")).toBe("Road to AFC");
    expect(programEventLabel("PROGRAM_CHAMPIONS26")).toBe("Champions");
    expect(programEventLabel("PROGRAM_SUMMERSPECIAL")).toBe("Summer Special");
    expect(programEventLabel("PROGRAM_RECORDHOLDERS")).toBe("Record Holders");
    expect(programEventLabel("PROGRAM_TWG26")).toBe("The World's Game 26");
    expect(programEventLabel("PROGRAM_CAPPED_LEGENDS_26")).toBe("Capped Legends");
    expect(programEventLabel("PROGRAM_OUTSTANDING26")).toBe("Outstanding");
    expect(programEventLabel("PROGRAM_TOTY26")).toBe("TOTY 26");
    expect(programEventLabel("PROGRAM_ICONS")).toBe("Icons");
    expect(programEventLabel("PROGRAM_HEROS8")).toBe("Heroes");
    expect(programEventLabel("FC_BASE_GOLD")).toBe("FC Base Gold Player");
    expect(programEventLabel("FC_BASE_SILVER")).toBe("FC Base Silver Player");
    expect(programEventLabel("PROGRAM_MOMENT25")).toBe("Moments 25");
  });
});

describe("programLogoSrc", () => {
  it("maps catalog aliases to origin-served logo paths", () => {
    expect(programLogoSrc("PROGRAM_TOTW27")).toBe("/program-logos/TOTW27.png");
    expect(programLogoSrc("PROGRAM_UB27")).toBe("/program-logos/UB27.png");
    expect(programLogoSrc("PROGRAM_HOFS")).toBe("/program-logos/HOFS.png");
    expect(programLogoSrc("PROGRAM_ANN27")).toBe("/program-logos/ANN27.png");
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

  it("puts an unknown event ahead of the hardcoded list", () => {
    expect(programEventOrder("PROGRAM_NEWPROMO28")).toBeLessThan(
      programEventOrder("PROGRAM_TOTW27"),
    );
  });

  it("falls back to an allowlisted PROGRAM_ slug when unknown", () => {
    expect(programLogoSrc("PROGRAM_NEWPROMO26")).toBe(
      "/program-logos/NEWPROMO26.png",
    );
    expect(programLogoSrc("PROGRAM_bad-slug")).toBeUndefined();
    expect(programLogoSrc("../etc/passwd")).toBeUndefined();
    expect(unknownProgramLogoSlug("PROGRAM_NEWPROMO26")).toBe("NEWPROMO26");
    expect(unknownProgramLogoSlug("PROGRAM_TOTW27")).toBeUndefined();
    expect(programLogoUpstreamUrl("NEWPROMO26")).toBe(
      "https://images-v2-unsigned.renderz.app/programlogos_23_NEWPROMO26",
    );
  });

  it("resolves catalog slugs for events whose PNG is not in public yet", () => {
    expect(programLogoSlug("PROGRAM_TOTW26")).toBe("TOTW26");
    expect(programLogoSlug("PROGRAM_ANS26")).toBe("ANS26");
    expect(programLogoSlug("PROGRAM_GE26")).toBe("GE26");
    expect(programLogoSlug("PROGRAM_BO26")).toBe("BO26");
    expect(programLogoSlug("FC_BASE_GOLD")).toBeUndefined();
    expect(programLogoSlug("FC_BASE_SILVER")).toBeUndefined();
    expect(programLogoSrc("FC_BASE_GOLD")).toBeUndefined();
    expect(catalogProgramLogoSlugs()).toEqual(
      expect.arrayContaining([
        "TOTW26",
        "ANS26",
        "ANN26",
        "UCL26",
        "FV26",
        "GE26",
        "SONGKRAN26",
        "BO26",
        "CL26",
        "TOTW27",
      ]),
    );
  });
});

describe("sortProgramFacets", () => {
  it("orders like the RenderZ Program / Event list (newest first)", () => {
    const sorted = sortProgramFacets([
      { value: "PROGRAM_TWG26", count: 800 },
      { value: "PROGRAM_HEROS8", count: 400 },
      { value: "PROGRAM_NUMERO26", count: 50 },
      { value: "PROGRAM_ICONS", count: 900 },
      { value: "PROGRAM_TOTW27", count: 10 },
      { value: "PROGRAM_ANN27", count: 20 },
      { value: "PROGRAM_CHAMPIONS26", count: 200 },
      { value: "PROGRAM_GC26", count: 40 },
    ]);
    expect(sorted.map((row) => row.value)).toEqual([
      "PROGRAM_TOTW27",
      "PROGRAM_ANN27",
      "PROGRAM_NUMERO26",
      "PROGRAM_GC26",
      "PROGRAM_CHAMPIONS26",
      "PROGRAM_TWG26",
      "PROGRAM_ICONS",
      "PROGRAM_HEROS8",
    ]);
    expect(programEventOrder("PROGRAM_TOTW27")).toBeLessThan(
      programEventOrder("PROGRAM_NUMERO26"),
    );
    expect(programEventOrder("PROGRAM_NUMERO26")).toBeLessThan(
      programEventOrder("PROGRAM_TWG26"),
    );
    expect(programEventOrder("PROGRAM_MOMENT25")).toBeLessThan(
      programEventOrder("PROGRAM_ICONS"),
    );
    expect(programEventOrder("PROGRAM_HEROS8")).toBeLessThan(
      programEventOrder("FC_BASE_GOLD"),
    );
    expect(programEventOrder("FC_BASE_GOLD")).toBeLessThan(
      programEventOrder("FC_BASE_SILVER"),
    );
  });
});
