import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const icons: Metadata["icons"] =
  process.env.NODE_ENV === "development"
    ? {
        icon: {
          type: "image/svg+xml",
          sizes: "any",
          url: "/brand-mark-dev.svg",
        },
        apple: "/favicon-dev.png",
      }
    : {
        icon: [
          {
            type: "image/svg+xml",
            sizes: "any",
            url: "/brand-mark.svg",
          },
          {
            type: "image/png",
            sizes: "128x128",
            url: "/favicon.png",
          },
        ],
        apple: "/favicon.png",
      };

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
