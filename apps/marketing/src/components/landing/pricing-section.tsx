import { ArrowRight, Check } from "lucide-react";
import { pricingItems } from "./data";

export function PricingSection({ bookDemoHref }: { bookDemoHref: string }) {
  return (
    <section className="bg-background py-20 sm:py-28" id="pricing">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Institution-sized pricing
          </p>
          <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            Start with what your school needs now.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Pricing reflects institution size, configuration, and enabled
            modules. No forced bundle of tools your team will not use.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {pricingItems.map((item) => (
            <article
              className={`relative flex min-h-[22rem] flex-col rounded-[1.5rem] border p-7 sm:p-8 ${item.featured ? "border-primary bg-[var(--brand-ink)] text-[var(--brand-ink-foreground)] shadow-[0_28px_80px_rgba(16,40,32,0.18)]" : "border-border bg-card text-card-foreground"}`}
              key={item.eyebrow}
            >
              {item.featured ? (
                <span className="absolute right-6 top-6 rounded-full bg-[var(--brand-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-foreground)]">
                  Core plan
                </span>
              ) : null}
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${item.featured ? "text-[var(--brand-inverse-muted)]" : "text-primary"}`}
              >
                {item.eyebrow}
              </p>
              <p className="mt-10 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                {item.price}
              </p>
              <p
                className={`mt-5 text-sm leading-7 ${item.featured ? "text-white/62" : "text-muted-foreground"}`}
              >
                {item.description}
              </p>
              <div
                className={`mt-auto flex items-center gap-2 border-t pt-5 text-xs font-semibold ${item.featured ? "border-white/12 text-[#c7e2d5]" : "border-border text-primary"}`}
              >
                <Check aria-hidden="true" size={14} />
                Scoped during your school review
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-[1.5rem] border border-border bg-[#e3efe7] px-6 py-6 sm:flex-row sm:px-8">
          <p className="text-sm font-medium text-[#1e4938] sm:text-base">
            Tell us how your school works. We will map the right setup and
            monthly plan.
          </p>
          <a
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90"
            href={bookDemoHref}
          >
            Get a tailored quote
            <ArrowRight aria-hidden="true" size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
