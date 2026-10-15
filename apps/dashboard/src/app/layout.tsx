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
import { IBM_Plex_Mono, IBM_Plex_Sans, Lora } from "next/font/google";

// Blueprint (ADR-0082): IBM Plex Sans for UI copy, Plex Mono for figures and labels.
const plexSans = IBM_Plex_Sans({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  display: "swap",
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
          `${plexSans.variable} ${plexMono.variable} ${lora.variable} font-sans`,
          "whitespace-pre-line overscroll-none antialiased",
          // "min-h-screen bg-background font-sans text-black antialiased",
          // fontSans.variable,
          // fontHeading.variable
        )}
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
