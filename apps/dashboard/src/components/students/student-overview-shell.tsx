"use client";

import {
  type StudentOverviewTab,
  useStudentOverviewSheet,
} from "@/hooks/use-student-overview-sheet";
import { cn } from "@school-clerk/ui/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@school-clerk/ui/tabs";
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

export function StudentOverviewShell({ mode = "sheet", className }: Props) {
  const { activeTab, isOpen, overviewData, setActiveTab } =
    useStudentOverviewSheet();

  if (!isOpen || !overviewData) return null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden sm:gap-6",
        mode === "page" && "mx-auto w-full max-w-7xl",
        className,
      )}
    >
      <StudentOverviewSheetHeader overview={overviewData} mode={mode} />
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as StudentOverviewTab)}
        className="min-w-0 max-w-full overflow-x-hidden"
      >
        <div className="min-w-0 max-w-full border-b border-border">
          <div className="w-full max-w-full touch-pan-x overflow-x-auto overscroll-x-contain px-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-0">
            <TabsList className="h-auto w-max min-w-full justify-start gap-3 rounded-none bg-transparent p-0 pr-8 text-muted-foreground sm:gap-6 sm:pr-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="inline-flex shrink-0 select-none items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-medium shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:px-1"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        <TabsContent
          value="overview"
          className={cn(
            "mt-0 min-w-0 max-w-full overflow-x-hidden",
            mode === "sheet" ? "pb-2" : "pb-8",
          )}
        >
          <StudentOverview />
        </TabsContent>
        <TabsContent
          value="academics"
          className={cn(
            "mt-0 min-w-0 max-w-full overflow-x-hidden",
            mode === "sheet" ? "pb-2" : "pb-8",
          )}
        >
          <StudentAcademicsOverview />
        </TabsContent>
        <TabsContent
          value="attendance"
          className={cn(
            "mt-0 min-w-0 max-w-full overflow-x-hidden",
            mode === "sheet" ? "pb-2" : "pb-8",
          )}
        >
          <StudentAttendanceHistory />
        </TabsContent>
        <TabsContent
          value="finance"
          className={cn(
            "mt-0 min-w-0 max-w-full overflow-x-hidden",
            mode === "sheet" ? "pb-2" : "pb-8",
          )}
        >
          <StudentTransactionOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
