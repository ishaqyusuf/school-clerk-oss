"use client";

import type { TabType } from "@/hooks/use-classroom-params";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Calendar,
  type LucideIcon,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ClassroomMetrics } from "./use-classroom-metrics";

export type ClassroomSection = Exclude<TabType, "overview">;

export const classroomSections: Array<{
  value: ClassroomSection;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "students", label: "Students", icon: Users },
  { value: "attendance", label: "Attendance", icon: Calendar },
  { value: "subjects", label: "Subjects", icon: BookOpen },
  { value: "payments", label: "Payments", icon: Banknote },
  { value: "performance", label: "Performance", icon: BarChart3 },
];

export function resolveClassroomSection(
  tab?: TabType | null,
): ClassroomSection {
  return tab && tab !== "overview" ? tab : "students";
}

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

type MetricPart = { text: string; attention?: boolean };

function sectionMetric(
  section: ClassroomSection,
  metrics: ClassroomMetrics,
): MetricPart[] | null {
  switch (section) {
    case "students": {
      const parts: MetricPart[] = [
        { text: `${metrics.students.count} enrolled` },
      ];
      const dupes = metrics.students.duplicateGroups;
      if (dupes > 0)
        parts.push({
          text: `${dupes} duplicate${dupes === 1 ? "" : "s"}`,
          attention: true,
        });
      return parts;
    }
    case "attendance": {
      if (metrics.attendance.isLoading) return null;
      const parts: MetricPart[] = [
        {
          text:
            metrics.attendance.averageRate === null
              ? "No sessions yet"
              : `${metrics.attendance.averageRate}% avg`,
        },
      ];
      parts.push(
        metrics.attendance.takenToday
          ? { text: "taken today" }
          : { text: "today not taken", attention: true },
      );
      return parts;
    }
    case "subjects": {
      if (metrics.subjects.isLoading) return null;
      const count = metrics.subjects.count;
      const parts: MetricPart[] = [
        { text: `${count} subject${count === 1 ? "" : "s"}` },
      ];
      const pending = metrics.subjects.needingWeights;
      if (pending > 0)
        parts.push({
          text: `${pending} need${pending === 1 ? "s" : ""} weights`,
          attention: true,
        });
      return parts;
    }
    case "payments": {
      if (metrics.payments.status === "loading") return null;
      if (metrics.payments.status === "disabled")
        return [{ text: "Finance not enabled" }];
      if (metrics.payments.status === "unavailable")
        return [{ text: "Unavailable" }];
      return metrics.payments.outstanding > 0
        ? [{ text: `${naira.format(metrics.payments.outstanding)} due` }]
        : [{ text: "Nothing outstanding" }];
    }
    case "performance":
      return [{ text: "Coming soon" }];
  }
}

function Metric({ parts }: { parts: MetricPart[] | null }) {
  if (!parts)
    return (
      <span className="block h-3 w-16 animate-pulse rounded bg-muted-foreground/15" />
    );
  return (
    <span className="truncate text-xs text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part.text}>
          {index > 0 ? " · " : null}
          <span
            className={cn(
              part.attention && "text-amber-700 dark:text-amber-400",
            )}
          >
            {part.text}
          </span>
        </span>
      ))}
    </span>
  );
}

interface NavProps {
  active: ClassroomSection;
  metrics: ClassroomMetrics;
  onSelect: (section: ClassroomSection) => void;
  onClose: () => void;
  switcher: ReactNode;
  termLabel?: string | null;
}

/** Desktop: a full-height rail beside the section page. */
export function ClassroomSectionRail({
  active,
  metrics,
  onSelect,
  onClose,
  switcher,
  termLabel,
}: NavProps) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-muted/40 lg:flex">
      <div className="flex flex-col gap-0.5 px-4 pb-4 pt-5">
        {switcher}
        {termLabel ? (
          <p className="text-xs text-muted-foreground">{termLabel}</p>
        ) : null}
      </div>
      <nav aria-label="Classroom sections" className="flex flex-col gap-0.5 px-2">
        {classroomSections.map((section) => {
          const isActive = section.value === active;
          const Icon = section.icon;
          return (
            <button
              key={section.value}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(section.value)}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-background shadow-sm ring-1 ring-border"
                  : "hover:bg-background/60",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm",
                    isActive ? "font-semibold text-foreground" : "font-medium",
                  )}
                >
                  {section.label}
                </span>
                <Metric parts={sectionMetric(section.value, metrics)} />
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
          Close
        </Button>
      </div>
    </aside>
  );
}

/** Phone and tablet: class switcher row plus a scrollable row of section chips. */
export function ClassroomSectionBar({
  active,
  metrics,
  onSelect,
  onClose,
  switcher,
  termLabel,
}: NavProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border pb-3 pt-4 lg:hidden">
      <div className="flex items-start gap-3 px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {switcher}
          {termLabel ? (
            <p className="text-xs text-muted-foreground">{termLabel}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close classroom"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      <nav
        aria-label="Classroom sections"
        className="no-scrollbar flex gap-2 overflow-x-auto px-4"
      >
        {classroomSections.map((section) => {
          const isActive = section.value === active;
          return (
            <button
              key={section.value}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(section.value)}
              className={cn(
                "flex min-w-[8.5rem] shrink-0 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-primary bg-primary text-primary-foreground [&_span]:text-primary-foreground/85"
                  : "border-border bg-card hover:bg-muted/60",
              )}
            >
              <span className="text-sm font-semibold">{section.label}</span>
              <Metric parts={sectionMetric(section.value, metrics)} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Page header shared by every section: title, one line of context, one primary action and an overflow menu. */
export function ClassroomSectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
