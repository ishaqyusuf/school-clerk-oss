import { ArrowRight, CheckCircle2 } from "lucide-react";
import { platformMetrics } from "./data";
import { ProductPreview } from "./product-preview";

export function HeroSection({
  bookDemoHref,
  signUpHref,
}: {
  bookDemoHref: string;
  signUpHref?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--brand-ink)] pt-[4.5rem] text-[var(--brand-ink-foreground)]">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[#2f8f68]/20 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-[90rem] px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/75">
            <span className="size-1.5 rounded-full bg-[var(--brand-gold)]" />
            Built for modern school operations
          </p>
          <h1 className="mt-7 font-serif text-[clamp(3rem,8vw,6.75rem)] font-medium leading-[0.96] tracking-[-0.055em] text-white">
            School operations,
            <span className="block italic text-[var(--brand-inverse-accent)]">
              finally connected.
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
            Bring admissions, academics, attendance, payments, results, and
            communication into one calm system that adapts to the way your
            institution works.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[var(--brand-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-paper)] sm:w-auto"
              href={bookDemoHref}
            >
              Book a demo
              <ArrowRight aria-hidden="true" size={16} />
            </a>
            {signUpHref ? (
              <a
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 sm:w-auto"
                href={signUpHref}
              >
                Create your school
              </a>
            ) : (
              <a
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 sm:w-auto"
                href="#platform"
              >
                Explore the platform
              </a>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/55">
            {[
              "Guided onboarding",
              "Flexible school setup",
              "Role-aware access",
            ].map((item) => (
              <span className="inline-flex items-center gap-1.5" key={item}>
                <CheckCircle2
                  aria-hidden="true"
                  className="text-[var(--brand-inverse-muted)]"
                  size={13}
                />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-14 lg:mt-20">
          <ProductPreview />
        </div>

        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-3 divide-x divide-white/12 border-y border-white/12 py-6 sm:mt-16 sm:py-7">
          {platformMetrics.map((metric) => (
            <div className="px-2 text-center sm:px-6" key={metric.label}>
              <dt className="text-[10px] uppercase tracking-[0.16em] text-white/55 sm:text-xs">
                {metric.label}
              </dt>
              <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
