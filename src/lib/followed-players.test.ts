import { describe, expect, it } from "vitest";
import {
  generateSyncCode,
  mergeFollowedPlayerIds,
  normalizeSyncCode,
  parseFollowedPlayerIds,
  SYNC_CODE_LENGTH,
  toggleFollowedPlayerId,
} from "@/lib/followed-players";

describe("follow sync codes", () => {
  it("generates codes that normalize to themselves", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateSyncCode();
      expect(code).toHaveLength(SYNC_CODE_LENGTH);
      expect(normalizeSyncCode(code)).toBe(code);
    }
  });

  it("maps random bytes onto the alphabet", () => {
    const code = generateSyncCode((bytes) => bytes.fill(0));
    expect(code).toBe("0".repeat(SYNC_CODE_LENGTH));
    expect(generateSyncCode((bytes) => bytes.fill(31))).toBe("Z".repeat(SYNC_CODE_LENGTH));
  });

  it("accepts lowercase, spaces, and dashes but rejects bad codes", () => {
    expect(normalizeSyncCode(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    expect(normalizeSyncCode("ABCDEFGHJ")).toBeNull();
    expect(normalizeSyncCode("ABCDEFGHJI")).toBeNull();
    expect(normalizeSyncCode("ABCDE/FGHJ")).toBeNull();
  });
});

describe("merge on link", () => {
  it("keeps server order first and appends local-only ids", () => {
    expect(mergeFollowedPlayerIds(["3", "2"], ["2", "5", "x"])).toEqual(["3", "2", "5"]);
    expect(mergeFollowedPlayerIds([], ["1"])).toEqual(["1"]);
  });

  it("caps the merged list", () => {
    const server = Array.from({ length: 80 }, (_, i) => String(i));
    const local = Array.from({ length: 80 }, (_, i) => String(i + 100));
    expect(mergeFollowedPlayerIds(server, local)).toHaveLength(100);
  });
});

describe("followed player ids", () => {
  it("ignores empty, broken, and non-numeric values", () => {
    expect(parseFollowedPlayerIds(null)).toEqual([]);
    expect(parseFollowedPlayerIds("not-json")).toEqual([]);
    expect(parseFollowedPlayerIds(JSON.stringify(["10", "10", "x", "11"]))).toEqual([
      "10",
      "11",
    ]);
  });

  it("toggles an id on, then off, without duplicates", () => {
    const added = toggleFollowedPlayerId([], "10");
    expect(added).toEqual(["10"]);
    expect(toggleFollowedPlayerId(added, "11")).toEqual(["11", "10"]);
    expect(toggleFollowedPlayerId(["11", "10"], "10")).toEqual(["11"]);
    expect(toggleFollowedPlayerId(["11"], "11")).toEqual([]);
  });
});
