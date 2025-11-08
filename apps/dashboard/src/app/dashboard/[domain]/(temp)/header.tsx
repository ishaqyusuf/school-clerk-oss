"use client";

import Link from "next/link";
import { Generate } from "./first-term-1446-1447/generate";
import { useGlobalParams } from "./first-term-1446-1447/use-global";
import { ThemeSwitch } from "@/components/theme-switch";

export function Header({}) {
  const g = useGlobalParams();
  const navLinks = [
    {
      href: `/first-term-1446-1447`,
      label: "Home",
    },
    {
      href: `/first-term-1446-1447/classrooms`,
      label: "Classrooms",
    },
    {
      href: `/first-term-1446-1447/payments`,
      label: "Payments",
    },
    {
      href: `/first-term-1446-1447/report-sheet`,
      label: "Report Sheet",
    },
    {
      href: `/2nd-term-accounting`,
      label: "2nd Term Accounting",
    },
  ];
  if (g.params.entryMode) return null;
  return (
    <div className="h-16 gap-4 border-b flex items-center px-6 bg-white hide-on-print">
      <nav className="flex items-center gap-6 text-sm font-medium">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-foreground transition-colors hover:text-foreground/80"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Generate />
      <ThemeSwitch />
    </div>
  );
}
