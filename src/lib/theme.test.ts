import { describe, expect, it } from "vitest";
import {
  isDarkTheme,
  parseThemePreference,
  themeInitScript,
} from "@/lib/theme";

describe("theme preference", () => {
  it("defaults to the system theme", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
  });

  it("keeps an explicit light or dark choice", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("follows the system only when the preference is system", () => {
    expect(isDarkTheme("system", true)).toBe(true);
    expect(isDarkTheme("system", false)).toBe(false);
    expect(isDarkTheme("light", true)).toBe(false);
    expect(isDarkTheme("dark", false)).toBe(true);
  });

  it("paints from local storage before the cookie", () => {
    expect(themeInitScript).toContain('localStorage.getItem("theme")');
    expect(themeInitScript).toContain("prefers-color-scheme: dark");
    expect(themeInitScript.indexOf("localStorage")).toBeLessThan(
      themeInitScript.indexOf("document.cookie"),
    );
  });
});
