import { EventsProvider } from "@school-clerk/events/client";
import "@school-clerk/ui/globals.css";
import "@/styles/globals.css";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { cn } from "@school-clerk/ui/cn";
import { NotificationsProvider } from "@school-clerk/notifications-react";
import { Toaster } from "@school-clerk/ui/toaster";
import { Providers } from "./providers";

import { StaticTrpc } from "@/components/static-trpc";
import { constructMetadata } from "@/utils/construct-metadata";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Inter,
  Lora,
} from "next/font/google";

// Clear Slate (ADR-0094): Inter for UI copy and figures (tabular numerals).
const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Arabic companion (ADR-0086). Inter has no Arabic glyphs, so the
// browser draws only Arabic characters with this font, per character, with no
// wrapper. Its Arabic face's unicode-range means pages without Arabic never fetch it.
const plexSansArabic = IBM_Plex_Sans_Arabic({
  display: "swap",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

// Real monospace, only for code, raw text input and keyboard hints (`font-code`).
const plexMono = IBM_Plex_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

const lora = Lora({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

// Slot Plex Sans Arabic between the Latin family and next/font's metric-matched
// fallback (local Arial / Courier New). Those fallbacks contain Arabic glyphs,
// so listed first they would draw every Arabic character.
function withArabic(fontFamily: string) {
  const [family, ...fallbacks] = fontFamily.split(",");
  return [family, plexSansArabic.style.fontFamily, ...fallbacks].join(",");
}

// `font-mono` is the figure font: Inter with tabular numerals (see globals.css).
// `font-code` is the true monospace.
const fontStacks = {
  "--font-sans-stack": withArabic(inter.style.fontFamily),
  "--font-mono-stack": withArabic(inter.style.fontFamily),
  "--font-code-stack": withArabic(plexMono.style.fontFamily),
} as React.CSSProperties;

export const metadata = constructMetadata();

export const maxDuration = 60;

// const fontSans = FontSans({
//   subsets: ["latin"],
//   variable: "--font-sans",
// }); // Font files can be colocated inside of `pages`
// const fontHeading = localFont({
//   src: "../styles/fonts/CalSans-SemiBold.woff2",
//   variable: "--font-heading",
// });
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {/*<Suspense>*/}
      {/*  <PostHogPageview />*/}
      {/*</Suspense>*/}
      <body
        className={cn(
          `${inter.variable} ${plexMono.variable} ${lora.variable} font-sans`,
          "whitespace-pre-line overscroll-none antialiased",
          // "min-h-screen bg-background font-sans text-black antialiased",
          // fontSans.variable,
          // fontHeading.variable
        )}
        style={fontStacks}
      >
        <NuqsAdapter>
          <NotificationsProvider>
            <Providers locale="en">
              <StaticTrpc />
              <EventsProvider>{children}</EventsProvider>
            </Providers>
          </NotificationsProvider>
          <Toaster />

          <TailwindIndicator />
        </NuqsAdapter>
      </body>
    </html>
  );
}
