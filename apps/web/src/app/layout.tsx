import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Clerk — Modern School Management System",
  description:
    "School Clerk is an open-source school management platform for handling academics, attendance, finance, inventory, and staffing — all in one place.",
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
