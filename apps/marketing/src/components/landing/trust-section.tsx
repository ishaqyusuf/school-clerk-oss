import { ArrowRight, DatabaseZap, Headphones, ShieldCheck } from "lucide-react";

const trustItems = [
  {
    icon: DatabaseZap,
    title: "A migration plan, not a blank spreadsheet",
    description:
      "Map existing student, academic, and finance records into a configuration your team understands before launch.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant-aware and role-aware by design",
    description:
      "Keep each institution’s data scoped to its workspace and give staff access based on the work they are responsible for.",
  },
  {
    icon: Headphones,
    title: "Support that stays with the rollout",
    description:
      "Start with the right modules, train the people doing the work, and add new workflows as the institution is ready.",
  },
] as const;

export function TrustSection({ bookDemoHref }: { bookDemoHref: string }) {
  return (
    <section className="border-b border-border bg-muted py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              A practical rollout
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl">
              Good software only matters when the school can actually adopt it.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              SchoolClerk combines configurable software with guided setup, so
              the system begins with your real institution instead of a generic
              demo account.
            </p>
            <a
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              href={bookDemoHref}
            >
              Talk through your rollout
              <ArrowRight aria-hidden="true" size={15} />
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] border border-border bg-border lg:grid-cols-3">
          {trustItems.map((item) => (
            <article className="bg-card p-7 sm:p-8" key={item.title}>
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <item.icon aria-hidden="true" size={20} />
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-card-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
