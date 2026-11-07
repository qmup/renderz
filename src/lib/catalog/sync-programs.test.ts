import { describe, expect, it } from "vitest";
import { isDeclinedSyncCard } from "@/lib/catalog/sync-programs";

describe("isDeclinedSyncCard", () => {
  it("declines Scream Team cards by program id or program name", () => {
    expect(isDeclinedSyncCard({ programId: "PROGRAM_SCREAMTEAM27" })).toBe(true);
    expect(
      isDeclinedSyncCard({ programName: "Scream Team Bearror Player" }),
    ).toBe(true);
    expect(
      isDeclinedSyncCard({
        programId: "PROGRAM_ICONS",
        programName: "Scream Team Icon Player",
      }),
    ).toBe(true);
  });

  it("keeps cards from selected programs", () => {
    expect(
      isDeclinedSyncCard({ programId: "PROGRAM_ICONS", programName: "Icon Player" }),
    ).toBe(false);
    expect(isDeclinedSyncCard({ programId: "PROGRAM_NEWPROMO28" })).toBe(false);
    expect(isDeclinedSyncCard({})).toBe(false);
  });

  it("declines older seasons", () => {
    expect(isDeclinedSyncCard({ programId: "PROGRAM_TOTS25" })).toBe(true);
  });
});
