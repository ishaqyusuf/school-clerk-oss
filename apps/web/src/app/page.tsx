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
  {
    name: "Student Records",
    description: "Centralised profiles, documents, and academic history for every student.",
  },
  {
    name: "Admissions",
    description: "Digital applications, shortlisting, offers, and enrolment in one flow.",
  },
  {
    name: "Attendance",
    description: "Daily or per-subject tracking with parent notifications built in.",
  },
  {
    name: "Results & Transcripts",
    description: "Grade entry, GPA computation, and official transcript generation.",
  },
  {
    name: "Billing & Payments",
    description: "Fee schedules, invoices, reminders, and payment reconciliation.",
  },
  {
    name: "Parent Portal",
    description: "Real-time access to results, attendance, fees, and announcements.",
  },
  {
    name: "External Exams",
    description: "Registration, candidate management, and results import for WAEC, NECO, and more.",
  },
  {
    name: "Communication",
    description: "SMS and in-app messaging to students, parents, and staff.",
  },
];

const highlights = [
  {
    number: "01",
    title: "Configurable by institution",
    copy: "Run one platform across nurseries, secondary schools, colleges, and universities with tenant-specific modules and academic structures.",
  },
  {
    number: "02",
    title: "Academic engine that adapts",
    copy: "Support terms or semesters, class arms or departments, and optional programs without rebuilding the product for every school type.",
  },
  {
    number: "03",
    title: "Operations in one flow",
    copy: "Move from admission to billing, attendance, internal assessments, and external exam registration in a connected workflow.",
  },
];

const metrics = [
  { value: "8+", label: "Institution models" },
  { value: "20+", label: "Operational modules" },
  { value: "1", label: "Connected system" },
];

const tickerItems = [...institutionTypes, ...institutionTypes];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* ─── Sticky Nav ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              SchoolClerk
            </span>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
            <a href="#modules" className="transition-colors hover:text-[var(--foreground)]">Modules</a>
            <a href="#platform" className="transition-colors hover:text-[var(--foreground)]">Platform</a>
            <a href="#pricing" className="transition-colors hover:text-[var(--foreground)]">Pricing</a>
          </nav>

          <a
            href="#pricing"
            className="hidden rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] transition hover:opacity-85 sm:inline-flex"
          >
            Book a demo
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative isolate overflow-hidden bg-[var(--foreground)] pt-24">
        {/* subtle texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(21,76,65,0.35),transparent)]" />

        <div className="relative mx-auto w-full max-w-7xl px-6 pb-0 pt-16 sm:px-10 lg:px-12 lg:pt-24">
          {/* eyebrow */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-light)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">
              Multi-tenant school SaaS
            </p>
          </div>

          {/* headline */}
          <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.08] tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.5rem]">
            One operating system for every school type.
          </h1>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_auto]">
            <p className="max-w-xl text-lg leading-8 text-white/60">
              SchoolClerk replaces paper-heavy admin, scattered spreadsheets, and
              rigid software with a configurable platform built for academics,
              finance, communication, and growth.
            </p>

            {/* metrics */}
            <div className="flex items-end gap-10 pb-1 lg:gap-12">
              {metrics.map((m) => (
                <div key={m.label} className="text-right lg:text-left">
                  <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                    {m.value}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-light)] hover:translate-y-[-1px]"
            >
              Book a demo
            </a>
            <a
              href="#modules"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/35 hover:text-white"
            >
              Explore modules →
            </a>
          </div>

          {/* Ticker strip at bottom of hero */}
          <div className="relative mt-16 overflow-hidden border-t border-white/10 py-5">
            <div className="flex gap-0">
              <div className="marquee-track flex shrink-0 gap-0">
                {tickerItems.map((item, i) => (
                  <span key={i} className="flex items-center gap-0 whitespace-nowrap">
                    <span className="px-6 text-xs font-semibold uppercase tracking-[0.26em] text-white/35">
                      {item}
                    </span>
                    <span className="h-3.5 w-px bg-white/15" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works / Highlights ─── */}
      <section id="platform" className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                Platform
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                Built to flex with any school model.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[var(--muted)] lg:text-right">
              Whether you run a single nursery or a network of secondary schools, SchoolClerk adapts to your structure.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--background)] p-7 transition hover:shadow-[0_20px_50px_rgba(23,20,16,0.08)]"
              >
                <p className="text-4xl font-semibold tracking-[-0.08em] text-[var(--border-strong)] transition group-hover:text-[var(--accent)] group-hover:opacity-100">
                  {item.number}
                </p>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.04em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Academic Engine Visual ─── */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                Academic engine
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                One hierarchy,<br />every institution.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[var(--muted)]">
                SchoolClerk's academic engine is composable. Configure sessions, terms, semesters, class arms, departments, and programs exactly the way your institution works — no hard-coded assumptions.
              </p>
              <ul className="mt-7 space-y-3">
                {["Works for term-based and semester-based calendars", "Supports class arms and departmental structures", "Optional program layers for colleges and polytechnics"].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual flow diagram */}
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--foreground)] p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/40">
                Academic structure
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { level: "Session", eg: "2024 / 2025" },
                  { level: "Term / Semester", eg: "First Term  ·  Second Term" },
                  { level: "Class / Level", eg: "JSS 1  ·  SS 2  ·  Year 3" },
                  { level: "Department", eg: "Science  ·  Arts  ·  Commercial" },
                  { level: "Program", eg: "Engineering  ·  Law  ·  Medicine" },
                ].map((row, i) => (
                  <div key={row.level} className="flex items-center gap-4 rounded-2xl bg-white/6 px-5 py-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold text-white/50">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{row.level}</p>
                      <p className="mt-0.5 truncate text-xs text-white/40">{row.eg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Modules ─── */}
      <section id="modules" className="border-b border-[var(--border)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Core modules
            </p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-4xl font-semibold tracking-[-0.05em]">
                Built for the real work<br className="hidden sm:block" /> schools do every day.
              </h2>
              <p className="max-w-xs text-sm leading-7 text-[var(--muted)]">
                Start with what you need now, enable more as operations mature.
              </p>
            </div>
          </div>

          <div className="grid gap-px rounded-[2rem] border border-[var(--border)] bg-[var(--border)] overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((mod, i) => (
              <div
                key={mod.name}
                className="group bg-[var(--background)] px-6 py-7 transition hover:bg-[var(--surface)]"
              >
                <span className="text-xs font-semibold tabular-nums tracking-[0.22em] text-[var(--muted-light)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.03em]">
                  {mod.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {mod.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Institution Types ─── */}
      <section className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                Who it's for
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                Every institution model, covered.
              </h2>
              <p className="mt-4 max-w-sm text-base leading-7 text-[var(--muted)]">
                SchoolClerk is designed so that one product works seamlessly across the full spectrum of educational institutions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {institutionTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-4"
                >
                  <span className="flex h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="text-sm font-medium">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              Pricing
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
              Transparent, institution-sized pricing.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Setup */}
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--background)] p-7 shadow-[0_12px_40px_rgba(23,20,16,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
                Setup fee
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                ₦50k<span className="text-xl text-[var(--muted)]">–200k</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                One-time onboarding, data migration, and configuration to match your institution's structure.
              </p>
            </div>

            {/* Monthly */}
            <div className="relative rounded-[1.75rem] border-2 border-[var(--accent)] bg-[var(--foreground)] p-7 text-white shadow-[0_20px_60px_rgba(21,76,65,0.22)]">
              <div className="absolute -top-3.5 left-7">
                <span className="rounded-full bg-[var(--accent)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-foreground)]">
                  Most popular
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/50">
                Monthly SaaS
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white">
                ₦10k<span className="text-xl text-white/50">–50k</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Per institution per month. Includes platform updates, uptime, and support. Scales with school size.
              </p>
              <a
                href="#"
                className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-light)]"
              >
                Book a demo
              </a>
            </div>

            {/* Add-ons */}
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--background)] p-7 shadow-[0_12px_40px_rgba(23,20,16,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
                Add-ons
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
                À la carte
              </p>
              <div className="mt-4 space-y-2.5">
                {["AI assistant", "SMS notifications", "White-label mobile app"].map((addon) => (
                  <div key={addon} className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1.5 3.5H5.5M3.5 1.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    {addon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="border-t border-[var(--border)] bg-[var(--foreground)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
          <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div>
              <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.05em] text-white">
                Ready to replace scattered admin with one calm system?
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-light)]"
              >
                Book a demo
              </a>
              <a
                href="#modules"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/75 transition hover:border-white/35 hover:text-white"
              >
                See all modules
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/10 bg-[var(--foreground)]">
        <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
                  <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                  <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
                  <rect x="8" y="8" width="5" height="5" rx="1" fill="white" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">SchoolClerk</span>
            </div>

            <div className="flex items-center gap-7 text-xs text-white/35">
              <a href="#modules" className="transition hover:text-white/70">Modules</a>
              <a href="#platform" className="transition hover:text-white/70">Platform</a>
              <a href="#pricing" className="transition hover:text-white/70">Pricing</a>
            </div>

            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} SchoolClerk. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
