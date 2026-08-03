import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const footerLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Workflows", href: "#workflows" },
  { label: "For your team", href: "#roles" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function LandingFooter({ bookDemoHref }: { bookDemoHref: string }) {
  return (
    <footer className="bg-[var(--brand-ink)] text-[var(--brand-ink-foreground)]">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col items-start justify-between gap-8 border-b border-white/12 py-16 sm:py-20 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-inverse-muted)]">
              Ready when your school is
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Replace scattered administration with one calm system.
            </h2>
          </div>
          <a
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[var(--brand-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-paper)]"
            href={bookDemoHref}
          >
            Book a demo
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>

        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-start">
          <Link
            aria-label="SchoolClerk home"
            className="flex items-center gap-3"
            href="/"
          >
            <BrandLogo size={32} tone="light" />
            <span className="text-sm font-semibold">SchoolClerk</span>
          </Link>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55"
          >
            {footerLinks.map((item) => (
              <a
                className="transition hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-white/55 lg:text-right">
            © {new Date().getFullYear()} SchoolClerk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
