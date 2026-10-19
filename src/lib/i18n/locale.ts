export const LOCALES = ["en", "vi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function parseLocale(value: string | null | undefined): Locale {
  return value === "vi" ? "vi" : DEFAULT_LOCALE;
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
}

export function dateLocale(locale: Locale): string {
  return locale === "vi" ? "vi" : "en";
}
