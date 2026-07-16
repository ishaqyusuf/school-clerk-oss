import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
  title: "SchoolClerk School Site",
  description: "Public school website runtime powered by template registry.",
  icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
