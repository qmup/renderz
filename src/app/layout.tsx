import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Oswald } from "next/font/google";
import localFont from "next/font/local";
import { QueryProvider } from "@/components/providers/query-provider";
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

export const metadata: Metadata = {
  title: {
    default: "FC Mobile catalog",
    template: "%s · FC Mobile catalog",
  },
  description:
    "Personal read-only FC Mobile player catalog. The browser talks only to this origin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${cardDisplay.variable} ${cruyff.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
