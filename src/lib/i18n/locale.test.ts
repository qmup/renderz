import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n/messages";
import { DEFAULT_LOCALE, parseLocale } from "@/lib/i18n/locale";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "function" || value === null || typeof value !== "object") {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale", () => {
  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale("vi")).toBe("vi");
  });

  it("keeps English and Vietnamese dictionaries aligned", () => {
    expect(leafKeys(messages.vi).sort()).toEqual(leafKeys(messages.en).sort());
  });

  it("pluralizes player counts in English only", () => {
    expect(messages.en.playerCount(1)).toBe("1 player");
    expect(messages.en.playerCount(2)).toBe("2 players");
    expect(messages.vi.playerCount(1)).toBe("1 cầu thủ");
    expect(messages.vi.playerCount(2)).toBe("2 cầu thủ");
  });
});
