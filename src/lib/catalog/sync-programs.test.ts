import { describe, expect, it } from "vitest";
import { isDeclinedSyncProgram } from "@/lib/catalog/sync-programs";

describe("isDeclinedSyncProgram", () => {
  it("keeps selected and unknown programs", () => {
    expect(isDeclinedSyncProgram("PROGRAM_SCREAMTEAM27")).toBe(false);
    expect(isDeclinedSyncProgram("PROGRAM_ICONS")).toBe(false);
    expect(isDeclinedSyncProgram("PROGRAM_NEWPROMO28")).toBe(false);
    expect(isDeclinedSyncProgram(undefined)).toBe(false);
  });

  it("declines older seasons", () => {
    expect(isDeclinedSyncProgram("PROGRAM_TOTS25")).toBe(true);
  });
});
