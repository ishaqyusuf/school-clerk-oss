import { useStudentParams } from "@/hooks/use-student-params";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { StudentOverviewSheetHeader } from "../students/student-overview-sheet-header";
import { StudentOverview } from "../students/student-overview";
import { StudentAcademicsOverview } from "../students/student-academics-overview";
import {
  StudentOverviewSheetProvider,
  useStudentOverviewSheet,
} from "@/hooks/use-student-overview-sheet";
import { Suspense } from "react";
import { Skeleton } from "@school-clerk/ui/skeleton";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { StudentTransactionOverview } from "../students/student-transaction-overview";
import { StudentAttendanceHistory } from "../students/student-attendance-history";
import {
  CalendarDays,
  BookOpen,
  Banknote,
  Activity,
} from "lucide-react";
import { cn } from "@school-clerk/ui/cn";

export function StudentOverviewSheet({}) {
  const { studentViewId, setParams } = useStudentParams();

  const isOpen = Boolean(studentViewId);
  if (!isOpen) return null;

  return (
    <CustomSheet
      floating
      rounded
      size="lg"
      open={isOpen}
      onOpenChange={() => setParams(null)}
      sheetName="student-overview"
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <StudentOverviewSheetProvider>
          <Content />
        </StudentOverviewSheetProvider>
      </Suspense>
    </CustomSheet>
  );
}

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "academics", label: "Academics", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "finance", label: "Payments", icon: Banknote },
] as const;

export function Content({}) {
  const { studentViewTab, setParams } = useStudentParams();
  const { overviewData, isOpen } = useStudentOverviewSheet();
  if (!isOpen) return null;

  const activeTab = studentViewTab || "academics";

  return (
    <>
      <StudentOverviewSheetHeader overview={overviewData} />

      {/* Tabs Navigation */}
      <div className="border-b border-border px-2">
        <nav aria-label="Tabs" className="flex space-x-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setParams({ studentViewTab: tab.id })}
              className={cn(
                "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <CustomSheetContent className="flex flex-col gap-2">
        {activeTab === "overview" && <StudentOverview />}
        {activeTab === "academics" && <StudentAcademicsOverview />}
        {activeTab === "attendance" && <StudentAttendanceHistory />}
        {activeTab === "finance" && <StudentTransactionOverview />}
      </CustomSheetContent>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <SheetHeader>
        <SheetTitle></SheetTitle>
        <SheetDescription asChild>
          <div className="flex gap-4 items-center">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="flex gap-4 px-4 border-b border-border py-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-6 gap-4 p-4">
        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />
        <Skeleton className="h-36 col-span-6" />
      </div>
    </>
  );
}
