import {
  ArrowDownRight,
  BookOpenCheck,
  FileCheck2,
  ReceiptText,
} from "lucide-react";

const workflows = [
  {
    number: "01",
    icon: FileCheck2,
    title: "Admit once",
    description:
      "Move approved applicants into complete student records without entering the same information again.",
    detail: "Application → enrolment → student profile",
  },
  {
    number: "02",
    icon: BookOpenCheck,
    title: "Run the school day",
    description:
      "Keep attendance, classes, assessments, report cards, staff, and communication in the same academic context.",
    detail: "Class roster → attendance → results",
  },
  {
    number: "03",
    icon: ReceiptText,
    title: "See every payment",
    description:
      "Connect fee schedules, family balances, collections, payables, and finance reporting without spreadsheet reconciliation.",
    detail: "Billable → payment → ledger",
  },
] as const;

export function WorkflowSection() {
  return (
    <section className="bg-muted py-20 sm:py-28" id="workflows">
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Connected workflows
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl font-medium leading-[1.03] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
              From first inquiry to final report, every handoff stays connected.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end lg:text-lg lg:leading-8">
            SchoolClerk keeps one operational record moving through the school.
            Staff spend less time copying data between tools and more time
            acting on what is already there.
          </p>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-[1.5rem] border border-border bg-border shadow-[0_24px_70px_rgba(16,40,32,0.08)] lg:grid-cols-3 lg:gap-px">
          {workflows.map((workflow, index) => (
            <article
              className="group relative bg-card p-6 sm:p-8 lg:min-h-[26rem] lg:p-9"
              key={workflow.number}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                  {workflow.number}
                </span>
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <workflow.icon aria-hidden="true" size={20} />
                </div>
              </div>
              <div className="mt-16 lg:mt-24">
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-card-foreground">
                  {workflow.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {workflow.description}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 border-t border-border pt-4 text-xs font-semibold text-primary">
                  {workflow.detail}
                  <ArrowDownRight aria-hidden="true" size={14} />
                </div>
              </div>
              {index < workflows.length - 1 ? (
                <div className="absolute -bottom-px left-6 right-6 h-px bg-border lg:-right-px lg:bottom-8 lg:left-auto lg:top-8 lg:h-auto lg:w-px" />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
