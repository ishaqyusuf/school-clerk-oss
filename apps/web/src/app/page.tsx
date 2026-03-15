const institutionTypes = [
  "Pre-School",
  "Primary School",
  "Secondary School",
  "College",
  "Polytechnic",
  "University",
  "Training Institute",
  "Religious School",
];

const modules = [
  "Student records",
  "Admissions",
  "Attendance",
  "Results and transcripts",
  "Billing and payments",
  "Parent portal",
  "External exams",
  "Communication",
];

const highlights = [
  {
    title: "Configurable by institution",
    copy:
      "Run one platform across nurseries, secondary schools, colleges, and universities with tenant-specific modules and academic structures.",
  },
  {
    title: "Academic engine that adapts",
    copy:
      "Support terms or semesters, class arms or departments, and optional programs without rebuilding the product for every school type.",
  },
  {
    title: "Operations in one flow",
    copy:
      "Move from admission to billing, attendance, internal assessments, and external exam registration in a connected workflow.",
  },
];

const metrics = [
  { value: "8+", label: "Institution models supported" },
  { value: "20+", label: "Operational modules planned" },
  { value: "1", label: "Tenant per school deployment model" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(9,74,61,0.22),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(202,138,4,0.16),_transparent_28%),linear-gradient(180deg,_#f7f3ea_0%,_#f4efe4_45%,_#efe7d8_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-black/10" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-10 lg:px-12">
          <header className="flex items-center justify-between gap-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--muted)]">
                SchoolClerk
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Education operations for every institution model
              </p>
            </div>

            <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
              <a href="#modules" className="transition hover:text-[var(--foreground)]">
                Modules
              </a>
              <a href="#architecture" className="transition hover:text-[var(--foreground)]">
                Platform
              </a>
              <a href="#pricing" className="transition hover:text-[var(--foreground)]">
                Pricing
              </a>
            </nav>
          </header>

          <div className="grid gap-12 pb-10 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:pb-20 lg:pt-20">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-[var(--muted)] backdrop-blur">
                Multi-tenant school SaaS
              </p>

              <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                One operating system for schools, colleges, and campuses.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                SchoolClerk helps institutions replace paper-heavy admin,
                scattered spreadsheets, and rigid software with a configurable
                platform for academics, finance, communication, and growth.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3.5 text-sm font-semibold text-[var(--background)] transition hover:translate-y-[-1px] hover:opacity-92"
                >
                  Book a demo
                </a>
                <a
                  href="#modules"
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/60 px-6 py-3.5 text-sm font-semibold text-[var(--foreground)] backdrop-blur transition hover:border-black/25"
                >
                  Explore modules
                </a>
              </div>

              <div className="mt-10 grid max-w-2xl gap-5 border-t border-black/10 pt-8 sm:grid-cols-3">
                {metrics.map((item) => (
                  <div key={item.label}>
                    <p className="text-3xl font-semibold tracking-[-0.05em]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-[var(--panel)] p-5 shadow-[0_30px_80px_rgba(41,37,36,0.12)] backdrop-blur">
              <div className="rounded-[1.5rem] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,244,236,0.94))] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      Tenant setup
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                      Configured per institution
                    </h2>
                  </div>
                  <div className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-foreground)]">
                    Live model
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  {institutionTypes.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {item}
                      </span>
                      <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                        supported
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl bg-[var(--foreground)] px-5 py-5 text-[var(--background)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                    Academic engine
                  </p>
                  <p className="mt-3 text-base leading-7 text-white/90">
                    Session {"->"} Term/Semester {"->"} Class/Level {"->"}{" "}
                    Department {"->"} Program
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="modules"
        className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12"
      >
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Core modules
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
              Built for the real work schools do every day.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--muted)]">
              Start with what each institution needs now, then turn on more
              modules as operations mature.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module}
                className="rounded-[1.5rem] border border-black/10 bg-white px-5 py-5 shadow-[0_20px_45px_rgba(41,37,36,0.06)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Module
                </p>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em]">
                  {module}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="architecture"
        className="border-y border-black/10 bg-[var(--surface)]"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 sm:px-10 lg:grid-cols-3 lg:px-12">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-black/10 bg-white/70 p-6 backdrop-blur"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Platform
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                {item.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] bg-[var(--foreground)] p-8 text-[var(--background)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              Why teams switch
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em]">
              Replace fragmented admin with one calm, connected system.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/78">
              From fee reminders to exam registration and report generation,
              SchoolClerk is designed to reduce manual work while keeping each
              tenant in control of its own structure.
            </p>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_25px_60px_rgba(41,37,36,0.08)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Pricing model
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                  Setup
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                  N50k - N200k
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                  Monthly SaaS
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                  N10k - N50k
                </p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                  Add-ons
                </p>
                <p className="mt-2 text-base leading-7 text-[var(--muted)]">
                  AI assistant, SMS notifications, white-label mobile app
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
