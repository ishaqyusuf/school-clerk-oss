import { Plus } from "lucide-react";
import { faqItems } from "./data";

export function FaqSection() {
  return (
    <section
      className="border-t border-border bg-background py-20 sm:py-28"
      id="faq"
    >
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Questions before the demo
          </p>
          <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl">
            The practical details.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">
            A quick overview of fit, migration, modules, and pricing before we
            review your institution together.
          </p>
        </div>

        <div className="border-t border-border">
          {faqItems.map((item) => (
            <details
              className="group border-b border-border"
              key={item.question}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-base font-semibold tracking-[-0.02em] text-foreground sm:text-lg">
                {item.question}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45 group-open:border-primary group-open:text-primary">
                  <Plus aria-hidden="true" size={15} />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-sm leading-7 text-muted-foreground sm:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
