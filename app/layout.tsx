import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

/**
 * Pandai's typeface. This site used Geist - the Next.js default - until
 * 2026-09-11, when the product's own DS layer was imported from
 * pandai.question.uiux (see scripts/sync-app-ds.mjs).
 *
 * The same four weights the product loads, because the type roles use exactly
 * these: 400, 500, 600, 700. Poppins is not a variable font, so next/font needs
 * them listed. Self-hosted at build time rather than fetched from Google at
 * runtime like the product does - no third-party request on every page view.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "gamerator",
  // Was still describing the learning-game product this stopped being on
  // 2026-09-06 - and it is the description search results and link previews use.
  description:
    "Describe an arcade game and get a playable one, wearing the real Pandai mascots and design system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
