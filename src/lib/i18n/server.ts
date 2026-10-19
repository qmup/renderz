import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "@/lib/i18n/locale";
import {
  parseThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from "@/lib/theme";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function getThemePreference(): Promise<ThemePreference> {
  const jar = await cookies();
  return parseThemePreference(jar.get(THEME_COOKIE)?.value);
}
