export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE = "theme";
export const THEME_EVENT = "fc-theme";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function isDarkTheme(
  preference: ThemePreference,
  systemDark: boolean,
): boolean {
  return preference === "dark" || (preference === "system" && systemDark);
}

/**
 * Runs before paint. Preference order matches `readThemePreference`:
 * localStorage, then the theme cookie, then system.
 */
export const themeInitScript = `(function(){try{var pref=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(pref!=="light"&&pref!=="dark"&&pref!=="system"){var match=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);pref=match?decodeURIComponent(match[1]):"system";}if(pref!=="light"&&pref!=="dark"&&pref!=="system")pref="system";var dark=pref==="dark"||(pref==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.dataset.theme=pref;}catch(e){}})();`;

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // private mode
  }
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  if (!match?.[1]) {
    return "system";
  }
  try {
    return parseThemePreference(decodeURIComponent(match[1]));
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = isDarkTheme(preference, systemDark);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.theme = preference;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // private mode
  }
  document.cookie = `${THEME_COOKIE}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  const onChange = () => onStoreChange();
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
