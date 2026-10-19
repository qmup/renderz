"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locale";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

function PreferenceMenu({
  label,
  triggerClassName,
  trigger,
  children,
}: {
  label: string;
  triggerClassName?: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 px-2", triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="bg-popover text-popover-foreground absolute right-0 z-50 mt-1 min-w-44 rounded-lg border p-1 shadow-md"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function MenuChoice({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className={cn(
        "hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none",
        checked && "bg-muted/80",
      )}
      onClick={onSelect}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {checked ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <span className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}

const THEME_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

export function HeaderControls() {
  const { locale, setLocale, theme, setTheme, m } = usePreferences();
  const ThemeIcon = THEME_ICONS[theme];
  const themeLabel =
    theme === "light" ? m.themeLight : theme === "dark" ? m.themeDark : m.themeSystem;
  const languageLabel = locale === "vi" ? m.languageVietnamese : m.languageEnglish;

  function chooseTheme(next: ThemePreference, close: () => void) {
    setTheme(next);
    close();
  }

  function chooseLocale(next: Locale, close: () => void) {
    setLocale(next);
    close();
  }

  return (
    <div className="flex items-center">
      <PreferenceMenu
        label={m.themeButton(themeLabel)}
        triggerClassName="w-8 px-0"
        trigger={<ThemeIcon aria-hidden />}
      >
        {(close) => (
          <>
            <MenuChoice
              checked={theme === "system"}
              onSelect={() => chooseTheme("system", close)}
            >
              <Monitor className="size-3.5" aria-hidden />
              {m.themeSystem}
            </MenuChoice>
            <MenuChoice
              checked={theme === "light"}
              onSelect={() => chooseTheme("light", close)}
            >
              <Sun className="size-3.5" aria-hidden />
              {m.themeLight}
            </MenuChoice>
            <MenuChoice
              checked={theme === "dark"}
              onSelect={() => chooseTheme("dark", close)}
            >
              <Moon className="size-3.5" aria-hidden />
              {m.themeDark}
            </MenuChoice>
          </>
        )}
      </PreferenceMenu>
      <PreferenceMenu
        label={m.languageButton(languageLabel)}
        trigger={
          <span className="text-xs font-semibold tracking-wide">
            {locale === "vi" ? "VI" : "EN"}
          </span>
        }
      >
        {(close) => (
          <>
            <MenuChoice
              checked={locale === "en"}
              onSelect={() => chooseLocale("en", close)}
            >
              {m.languageEnglish}
            </MenuChoice>
            <MenuChoice
              checked={locale === "vi"}
              onSelect={() => chooseLocale("vi", close)}
            >
              {m.languageVietnamese}
            </MenuChoice>
          </>
        )}
      </PreferenceMenu>
    </div>
  );
}
