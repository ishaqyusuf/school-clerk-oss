import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolClerk",
  description:
    "Configurable education operations software for schools, colleges, universities, and training institutes.",
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
