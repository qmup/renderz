import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Oswald } from "next/font/google";
import localFont from "next/font/local";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { messages } from "@/lib/i18n/messages";
import { getLocale, getThemePreference } from "@/lib/i18n/server";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cardDisplay = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: "700",
});

const cruyff = localFont({
  src: "../fonts/CruyffSansCondensed-Bold.woff2",
  weight: "700",
  style: "normal",
  variable: "--font-cruyff",
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const copy = messages[await getLocale()];
  return {
    title: {
      default: copy.metaTitle,
      template: `%s · ${copy.metaTitle}`,
    },
    description: copy.metaDescription,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getThemePreference()]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${cardDisplay.variable} ${cruyff.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <PreferencesProvider locale={locale} theme={theme}>
          <QueryProvider>{children}</QueryProvider>
        </PreferencesProvider>
        <Analytics />
      </body>
    </html>
  );
}
