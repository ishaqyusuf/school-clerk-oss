import {
  ArrowRight,
  Check,
  CircleDollarSign,
  MessageSquareText,
  School,
} from "lucide-react";

const hierarchy = [
  { label: "Academic session", value: "2026 / 2027" },
  { label: "Term or semester", value: "First term" },
  { label: "Class or level", value: "JSS 2 · Science" },
  { label: "Department or programme", value: "Optional layers" },
] as const;

const collectionRows = [
  { label: "Collected", value: "₦18.4m", width: "78%", tone: "bg-primary" },
  {
    label: "Outstanding",
    value: "₦4.2m",
    width: "38%",
    tone: "bg-[var(--brand-gold)]",
  },
  {
    label: "Pending allocation",
    value: "₦860k",
    width: "18%",
    tone: "bg-[#80ab98]",
  },
] as const;

export function PlatformSection() {
  return (
    <section className="bg-background py-20 sm:py-28" id="platform">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            The central school hub
          </p>
          <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            One record. One context. A clearer school day.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Every module shares the same school, session, term, and role
            context, so the information people see is useful from the moment
            they sign in.
          </p>
        </div>

        <div className="mt-16 space-y-5 sm:mt-20">
          <article className="grid overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_24px_80px_rgba(16,40,32,0.07)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <School aria-hidden="true" size={20} />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Academic engine
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-card-foreground sm:text-4xl">
                Built around how your institution is structured.
              </h3>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
                Configure term-based or semester-based calendars, class arms,
                departments, programmes, grading, and the language your staff
                already uses.
              </p>
              <a
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                href="#roles"
              >
                See how each team works
                <ArrowRight aria-hidden="true" size={15} />
              </a>
            </div>
            <div className="flex items-center bg-[#e7eee8] p-5 sm:p-8 lg:p-12">
              <div className="w-full rounded-2xl border border-[#d3ddd5] bg-white p-5 shadow-[0_18px_45px_rgba(16,40,32,0.09)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#e5e9e5] pb-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a867e]">
                      Academic structure
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#183126]">
                      Greenfield College
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e1f0e7] px-3 py-1 text-[10px] font-semibold text-[#1c6848]">
                    Active
                  </span>
                </div>
                <div className="mt-5 space-y-2.5">
                  {hierarchy.map((item, index) => (
                    <div
                      className="flex items-center gap-3 rounded-xl border border-[#e5e9e5] bg-[#fafbf8] p-3.5"
                      key={item.label}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e4eee7] text-[10px] font-semibold text-[#28694d]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#7b877f]">
                          {item.label}
                        </p>
                        <p className="truncate text-xs font-semibold text-[#273c32]">
                          {item.value}
                        </p>
                      </div>
                      {index < hierarchy.length - 1 ? (
                        <Check
                          aria-hidden="true"
                          className="ml-auto text-[#318160]"
                          size={14}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[1.75rem] border border-border bg-[var(--brand-ink)] text-[var(--brand-ink-foreground)] shadow-[0_24px_80px_rgba(16,40,32,0.14)]">
              <div className="p-7 sm:p-10">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-[var(--brand-inverse-accent)]">
                  <CircleDollarSign aria-hidden="true" size={20} />
                </div>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-inverse-muted)]">
                  Finance and fees
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                  Know what came in, what is due, and where it belongs.
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
                  Give bursars a connected view of billables, collections,
                  balances, payables, and the ledger behind every number.
                </p>
              </div>
              <div className="mx-5 rounded-t-2xl border border-b-0 border-white/12 bg-white/[0.07] p-5 sm:mx-8 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/55">First term</p>
                    <p className="text-sm font-semibold">Collection position</p>
                  </div>
                  <p className="font-serif text-3xl text-[#d5eadf]">82%</p>
                </div>
                <div className="mt-6 space-y-4">
                  {collectionRows.map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-[10px] text-white/60">
                        <span>{row.label}</span>
                        <span>{row.value}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${row.tone}`}
                          style={{ width: row.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_24px_80px_rgba(16,40,32,0.07)]">
              <div className="p-7 sm:p-10">
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <MessageSquareText aria-hidden="true" size={20} />
                </div>
                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  School community
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-card-foreground sm:text-4xl">
                  Keep staff and families looking at the same story.
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Give families one place to follow ward enrollment, fee
                  balances, collection status, and school-provided items.
                </p>
              </div>
              <div className="mx-5 rounded-t-2xl border border-b-0 border-border bg-[#f4f5ef] p-5 sm:mx-8 sm:p-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      Parent portal
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Amina's school overview
                    </p>
                  </div>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">
                    Current term
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    ["Approved", "Enrollment"],
                    ["3", "Items issued"],
                    ["₦0", "Balance due"],
                    ["1", "Ward"],
                  ].map(([value, label]) => (
                    <div
                      className="rounded-xl border border-border bg-white p-3.5"
                      key={label}
                    >
                      <p className="text-lg font-semibold tracking-[-0.04em] text-foreground">
                        {value}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
