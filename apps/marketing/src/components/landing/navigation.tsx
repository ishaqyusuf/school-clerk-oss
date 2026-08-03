"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  { label: "Platform", href: "#platform" },
  { label: "Workflows", href: "#workflows" },
  { label: "For your team", href: "#roles" },
  { label: "Pricing", href: "#pricing" },
] as const;

export function LandingNavigation({
  bookDemoHref,
  signUpHref,
}: {
  bookDemoHref: string;
  signUpHref?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          aria-label="SchoolClerk home"
          className="flex items-center gap-3"
          href="/"
          onClick={() => setIsOpen(false)}
        >
          <BrandLogo priority size={36} />
          <span className="text-[0.94rem] font-semibold tracking-[-0.02em] text-foreground">
            SchoolClerk
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 lg:flex"
        >
          {navigation.map((item) => (
            <a
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          {signUpHref ? (
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:border-foreground/30 hover:bg-muted"
              href={signUpHref}
            >
              Sign up
            </a>
          ) : null}
          <a
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90"
            href={bookDemoHref}
          >
            Book a demo
          </a>
        </div>

        <button
          aria-controls="mobile-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground lg:hidden"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          {isOpen ? (
            <X aria-hidden="true" size={19} />
          ) : (
            <Menu aria-hidden="true" size={19} />
          )}
        </button>
      </div>

      {isOpen ? (
        <div
          className="border-t border-border bg-background px-5 pb-6 pt-4 lg:hidden"
          id="mobile-navigation"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col">
            {navigation.map((item) => (
              <a
                className="border-b border-border/70 py-3.5 text-base font-medium text-foreground"
                href={item.href}
                key={item.href}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            href={bookDemoHref}
          >
            Book a demo
          </a>
        </div>
      ) : null}
    </header>
  );
}
