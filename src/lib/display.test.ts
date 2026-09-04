import { describe, expect, it } from "vitest";
import { CURRENT_PARSE_VERSION } from "@/lib/catalog/parse-version";
import {
  catalogRowNeedsEnrich,
  displayLabel,
  displayPlayStyleLabel,
  displayProgramName,
  displayTraitLabel,
  formatAddedDate,
  formatRetryAfter,
  isStaleCatalogRow,
} from "@/lib/display";
import {
  countPlayerListFilters,
  playerListQueryFromSearchParams,
  playerListQueryIsFiltered,
} from "@/lib/domain/query";

describe("displayLabel", () => {
  it("humanizes Common_ and work-rate keys", () => {
    expect(displayLabel("Common_Left")).toBe("Left");
    expect(displayLabel("PlayerInfo_WorkRate_High")).toBe("High");
  });

  it("humanizes playstyle keys while still hiding them from generic labels", () => {
    expect(displayLabel("PLAYSTYLE_TRICKSTER")).toBeUndefined();
    expect(displayPlayStyleLabel({ key: "PLAYSTYLE_AERIAL_DEFENSE" })).toBe(
      "Aerial Defense",
    );
    expect(displayPlayStyleLabel({ name: "Precision Header" })).toBe(
      "Precision Header",
    );
    expect(displayTraitLabel({ key: "traits_title_7" })).toBeUndefined();
    expect(displayTraitLabel({ name: "Hard Stop" })).toBe("Hard Stop");
  });

  it("hides unresolved i18n keys and page dumps", () => {
    expect(displayLabel("traits_title_7")).toBeUndefined();
    expect(displayLabel("TeamName_112893")).toBeUndefined();
    expect(displayLabel("PLAYSTYLE_TRICKSTER")).toBeUndefined();
    expect(displayLabel("like dislike download card")).toBeUndefined();
    expect(displayLabel("x".repeat(81))).toBeUndefined();
  });

  it("keeps ordinary names", () => {
    expect(displayLabel("Inter Miami CF")).toBe("Inter Miami CF");
    expect(displayLabel("Team of The Year 26 Player")).toBe(
      "Team of The Year 26 Player",
    );
  });
});

describe("displayProgramName", () => {
  it("prefers a clean program name over the id", () => {
    expect(displayProgramName("Icons Player", "PROGRAM_ICON")).toBe(
      "Icons Player",
    );
    expect(displayProgramName(undefined, "PROGRAM_ICON")).toBe("PROGRAM_ICON");
    expect(displayProgramName("x".repeat(200), "PROGRAM_ICON")).toBe(
      "PROGRAM_ICON",
    );
  });
});

describe("catalog freshness", () => {
  it("treats old parse versions and old fetchedAt as stale", () => {
    const now = 1_700_000_000_000;
    expect(
      isStaleCatalogRow(
        { fetchedAt: now, parseVersion: CURRENT_PARSE_VERSION },
        now,
      ),
    ).toBe(false);
    expect(
      isStaleCatalogRow(
        { fetchedAt: now, parseVersion: CURRENT_PARSE_VERSION - 1 },
        now,
      ),
    ).toBe(true);
    expect(
      isStaleCatalogRow(
        { fetchedAt: now - 25 * 60 * 60 * 1000, parseVersion: CURRENT_PARSE_VERSION },
        now,
      ),
    ).toBe(true);
  });

  it("re-enriches catalog rows whose playstyles still lack visible names", () => {
    expect(
      catalogRowNeedsEnrich({
        parseVersion: CURRENT_PARSE_VERSION,
        playStyles: [
          {
            name: "Precision Header",
            description: "Player has exceptional performance when heading the ball.",
          },
        ],
      }),
    ).toBe(false);
    expect(
      catalogRowNeedsEnrich({
        parseVersion: CURRENT_PARSE_VERSION,
        playStyles: [{ name: undefined }],
      }),
    ).toBe(true);
    expect(
      catalogRowNeedsEnrich({
        parseVersion: CURRENT_PARSE_VERSION,
        playStyles: [{ name: "Accelerator" }],
        traits: [{ name: undefined }],
      }),
    ).toBe(true);
    expect(
      catalogRowNeedsEnrich({
        parseVersion: CURRENT_PARSE_VERSION,
        playStyles: [{ name: "Accelerator" }],
        traits: [{ name: "Long Passer" }],
      }),
    ).toBe(true);
    expect(
      catalogRowNeedsEnrich({
        parseVersion: CURRENT_PARSE_VERSION - 1,
        playStyles: [
          {
            name: "Precision Header",
            description: "Player has exceptional performance when heading the ball.",
          },
        ],
      }),
    ).toBe(true);
  });

  it("formats retry-after for rate-limit copy", () => {
    expect(formatRetryAfter(undefined)).toBe("a moment");
    expect(formatRetryAfter(1500)).toBe("2s");
    expect(formatRetryAfter(120_000)).toBe("2m");
  });

  it("formats addedAt as a compact UTC date", () => {
    expect(formatAddedDate(Date.parse("2026-09-01T23:30:00.000Z"))).toBe(
      "Sep 1, 2026",
    );
    expect(formatAddedDate(Date.parse("2026-01-14T00:00:00.000Z"))).toBe(
      "Jan 14, 2026",
    );
  });
});

describe("player list filter helpers", () => {
  it("counts facet filters separately from search", () => {
    const query = playerListQueryFromSearchParams(
      new URLSearchParams("q=messi&position=ST&ratingMin=100"),
    );
    expect(countPlayerListFilters(query)).toBe(2);
    expect(playerListQueryIsFiltered(query)).toBe(true);
    expect(
      playerListQueryIsFiltered(playerListQueryFromSearchParams(new URLSearchParams())),
    ).toBe(false);
  });
});
