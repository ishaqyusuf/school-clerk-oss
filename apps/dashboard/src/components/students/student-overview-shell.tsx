"use client";

import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { cn } from "@school-clerk/ui/cn";
import { Activity, Banknote, BookOpen, CalendarDays } from "lucide-react";
import { StudentOverviewSheetHeader } from "./student-overview-sheet-header";
import { StudentOverview } from "./student-overview";
import { StudentAcademicsOverview } from "./student-academics-overview";
import { StudentAttendanceHistory } from "./student-attendance-history";
import { StudentTransactionOverview } from "./student-transaction-overview";

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "academics", label: "Academics", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "finance", label: "Payments", icon: Banknote },
] as const;

type Props = {
  mode?: "sheet" | "page";
  className?: string;
};

export function StudentOverviewShell({
  mode = "sheet",
  className,
}: Props) {
  const { activeTab, isOpen, overviewData, setActiveTab } =
    useStudentOverviewSheet();

  if (!isOpen || !overviewData) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-6",
        mode === "page" && "mx-auto w-full max-w-7xl",
        className
      )}
    >
      <StudentOverviewSheetHeader overview={overviewData} mode={mode} />

      <div className="border-b border-border">
        <nav
          aria-label="Student overview tabs"
          className="flex gap-6 overflow-x-auto scrollbar-hide"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
              type="button"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "min-w-0",
          mode === "sheet" ? "pb-2" : "pb-8"
        )}
      >
        {activeTab === "overview" && <StudentOverview />}
        {activeTab === "academics" && <StudentAcademicsOverview />}
        {activeTab === "attendance" && <StudentAttendanceHistory />}
        {activeTab === "finance" && <StudentTransactionOverview />}
      </div>
    </div>
  );
}
