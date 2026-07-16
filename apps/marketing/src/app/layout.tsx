import type { Metadata } from "next";
import "@school-clerk/ui/globals.css";
import "@/styles/globals.css";

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
  title: "School Clerk — Modern School Management System",
  description:
    "School Clerk is an open-source school management platform for handling academics, attendance, finance, inventory, and staffing — all in one place.",
  icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
