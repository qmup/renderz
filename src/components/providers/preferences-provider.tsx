"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";
import { messages, type Messages } from "@/lib/i18n/messages";
import {
  applyThemePreference,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";

type Preferences = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  m: Messages;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({
  locale,
  theme,
  children,
}: {
  locale: Locale;
  theme: ThemePreference;
  children: ReactNode;
}) {
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [seenLocale, setSeenLocale] = useState(locale);
  if (locale !== seenLocale) {
    setSeenLocale(locale);
    setCurrentLocale(locale);
  }
  const currentTheme = useSyncExternalStore(
    subscribeTheme,
    readThemePreference,
    () => theme,
  );

  useEffect(() => {
    document.documentElement.lang = currentLocale;
  }, [currentLocale]);

  useEffect(() => {
    if (currentTheme !== "system") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemePreference("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [currentTheme]);

  const setLocale = useCallback(
    (next: Locale) => {
      setCurrentLocale(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );

  const setTheme = useCallback((next: ThemePreference) => {
    applyThemePreference(next);
  }, []);

  const value = useMemo<Preferences>(
    () => ({
      locale: currentLocale,
      setLocale,
      theme: currentTheme,
      setTheme,
      m: messages[currentLocale],
    }),
    [currentLocale, currentTheme, setLocale, setTheme],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return value;
}
