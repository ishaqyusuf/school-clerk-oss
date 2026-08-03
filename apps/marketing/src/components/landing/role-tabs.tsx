"use client";

import {
  BookOpenCheck,
  CircleDollarSign,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";

const roles = [
  {
    id: "administrator",
    label: "Administrator",
    icon: ShieldCheck,
    title: "See the whole institution without chasing updates.",
    description:
      "Monitor setup, student movement, staff activity, attendance, finance, and the work that still needs attention.",
    stats: [
      ["1,248", "active students"],
      ["93.8%", "attendance today"],
      ["6 / 7", "setup steps"],
    ],
    actions: [
      "Review pending admissions",
      "Publish the academic term",
      "Check school-wide activity",
    ],
  },
  {
    id: "bursar",
    label: "Bursar",
    icon: CircleDollarSign,
    title: "Move from balances to the underlying records in one click.",
    description:
      "Track collections, allocations, accounts, services, payroll, owing, and reconciliations from one finance workspace.",
    stats: [
      ["₦18.4m", "fees collected"],
      ["82%", "collection rate"],
      ["128", "balances due"],
    ],
    actions: [
      "Receive a student payment",
      "Review outstanding owing",
      "Reconcile the term ledger",
    ],
  },
  {
    id: "teacher",
    label: "Teacher",
    icon: BookOpenCheck,
    title: "Keep the school day focused on the class in front of you.",
    description:
      "Move between assigned classes, student rosters, attendance, assessment scores, and reports with the correct class already selected.",
    stats: [
      ["5", "classes today"],
      ["32", "reports pending"],
      ["96%", "class attendance"],
    ],
    actions: [
      "Take morning attendance",
      "Record assessment scores",
      "Prepare term reports",
    ],
  },
  {
    id: "parent",
    label: "Parent",
    icon: Users,
    title: "Give families one dependable view of school life.",
    description:
      "Parents can follow ward enrollment, balances, collection status, and school-provided items without calling the office for every answer.",
    stats: [
      ["Approved", "enrollment"],
      ["3", "items issued"],
      ["₦0", "balance due"],
    ],
    actions: [
      "Review ward status",
      "Check the fee summary",
      "See books and uniform items",
    ],
  },
] as const;

type RoleId = (typeof roles)[number]["id"];

export function RoleTabs() {
  const [activeId, setActiveId] = useState<RoleId>(roles[0].id);
  const activeRole = roles.find((role) => role.id === activeId) ?? roles[0];

  function moveTabFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const keyTargets = {
      ArrowLeft: (currentIndex - 1 + roles.length) % roles.length,
      ArrowRight: (currentIndex + 1) % roles.length,
      End: roles.length - 1,
      Home: 0,
    } as const;
    const targetIndex = keyTargets[event.key as keyof typeof keyTargets];

    if (targetIndex === undefined) return;

    event.preventDefault();
    const targetRole = roles[targetIndex];
    setActiveId(targetRole.id);
    document.getElementById(`role-tab-${targetRole.id}`)?.focus();
  }

  return (
    <section
      className="bg-[var(--brand-ink)] py-20 text-[var(--brand-ink-foreground)] sm:py-28"
      id="roles"
    >
      <div className="mx-auto w-full max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-inverse-muted)]">
              Made for the whole school
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              One platform. A focused workspace for every role.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/60 lg:justify-self-end lg:text-lg lg:leading-8">
            People should not have to understand the entire system to do today’s
            work. SchoolClerk keeps each role focused while the underlying
            records remain connected.
          </p>
        </div>

        <div
          className="mt-12 overflow-x-auto pb-2"
          role="tablist"
          aria-label="School roles"
        >
          <div className="flex min-w-max gap-2">
            {roles.map((role, index) => (
              <button
                aria-controls="role-panel"
                aria-selected={activeId === role.id}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${activeId === role.id ? "border-white bg-white text-[var(--brand-ink)]" : "border-white/15 bg-white/5 text-white/65 hover:border-white/30 hover:text-white"}`}
                id={`role-tab-${role.id}`}
                key={role.id}
                onClick={() => setActiveId(role.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
                role="tab"
                tabIndex={activeId === role.id ? 0 : -1}
                type="button"
              >
                <role.icon aria-hidden="true" size={15} />
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <div
          aria-labelledby={`role-tab-${activeRole.id}`}
          className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.06] lg:grid-cols-[0.9fr_1.1fr]"
          id="role-panel"
          role="tabpanel"
        >
          <div className="p-7 sm:p-10 lg:p-12">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/10 text-[var(--brand-inverse-accent)]">
              <activeRole.icon aria-hidden="true" size={20} />
            </span>
            <h3 className="mt-8 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              {activeRole.title}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
              {activeRole.description}
            </p>
            <ul className="mt-7 space-y-3">
              {activeRole.actions.map((action) => (
                <li
                  className="flex items-center gap-3 text-sm text-white/76"
                  key={action}
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#2d7c59] text-white">
                    <GraduationCap aria-hidden="true" size={11} />
                  </span>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#ecf0ea] p-5 text-[#173126] sm:p-8 lg:p-10">
            <div className="rounded-2xl border border-[#d7ded7] bg-white p-5 shadow-[0_20px_50px_rgba(8,30,21,0.12)] sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e6e9e5] pb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c887f]">
                    {activeRole.label} workspace
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    Today at Greenfield
                  </p>
                </div>
                <span className="size-2 rounded-full bg-[#2a9465] shadow-[0_0_0_5px_rgba(42,148,101,0.12)]" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {activeRole.stats.map(([value, label]) => (
                  <div
                    className="rounded-xl border border-[#e2e6e1] bg-[#f8f9f5] p-3 sm:p-4"
                    key={label}
                  >
                    <p className="text-lg font-semibold tracking-[-0.04em] sm:text-xl">
                      {value}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-[#758178] sm:text-[10px]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-[#e2e6e1] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Next actions</p>
                  <span className="text-[9px] font-medium text-[#2b7656]">
                    View all
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeRole.actions.map((action, index) => (
                    <div
                      className="flex items-center gap-3 rounded-lg bg-[#f7f8f4] px-3 py-2.5"
                      key={action}
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-[#e1ece4] text-[9px] font-semibold text-[#28684c]">
                        0{index + 1}
                      </span>
                      <span className="text-[10px] font-medium sm:text-xs">
                        {action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
