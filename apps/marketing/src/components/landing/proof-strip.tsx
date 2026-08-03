import { institutionTypes } from "./data";

export function ProofStrip() {
  return (
    <section
      aria-labelledby="institution-types-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              One platform, many school models
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.035em] text-foreground"
              id="institution-types-title"
            >
              Configured around your institution, not the other way around.
            </h2>
          </div>
          <ul className="flex max-w-4xl flex-wrap gap-2.5">
            {institutionTypes.map((type) => (
              <li
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground"
                key={type}
              >
                {type}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
