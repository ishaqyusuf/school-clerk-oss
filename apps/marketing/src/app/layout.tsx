import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "@school-clerk/ui/globals.css";
import "@/styles/globals.css";

const instrumentSans = Instrument_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const fraunces = Fraunces({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: "variable",
});

const icons: Metadata["icons"] =
  process.env.NODE_ENV === "development"
    ? [
        {
          rel: "apple-touch-icon",
          sizes: "128x128",
          url: "/favicon-dev.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "128x128",
          url: "/favicon-dev.png",
        },
      ]
    : [
        {
          rel: "apple-touch-icon",
          sizes: "128x128",
          url: "/favicon.png",
        },
        {
          rel: "icon",
          type: "image/png",
          media: "(prefers-color-scheme: light)",
          url: "/logo-light.png",
        },
        {
          rel: "icon",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
          url: "/logo-dark.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "128x128",
          url: "/favicon.png",
        },
      ];

export const metadata: Metadata = {
  title: "SchoolClerk — One connected system for school operations",
  description:
    "Connect admissions, academics, attendance, payments, results, staff, and family communication in one configurable school operations platform.",
  icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
