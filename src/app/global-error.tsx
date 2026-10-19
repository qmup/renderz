"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, parseLocale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";
import { themeInitScript } from "@/lib/theme";

function subscribeLocale(): () => void {
  return () => {};
}

function readLocaleFromCookie() {
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  return parseLocale(match?.[1]);
}

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    readLocaleFromCookie,
    () => DEFAULT_LOCALE,
  );

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy = messages[locale];

  return (
    <html lang={locale}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "4rem 1rem",
          maxWidth: "40rem",
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <title>{copy.appFailed}</title>
        <h1>{copy.appFailed}</h1>
        <p>{copy.appFailedBody}</p>
        <button type="button" onClick={retry}>
          {copy.tryAgain}
        </button>
      </body>
    </html>
  );
}
