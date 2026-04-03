import { useStudentParams } from "@/hooks/use-student-params";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { StudentOverviewSheetProvider } from "@/hooks/use-student-overview-sheet";
import { Suspense } from "react";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { StudentOverviewShell } from "../students/student-overview-shell";
import { Sheet } from "@school-clerk/ui/composite";

export function StudentOverviewSheet({}) {
  const { studentViewId, setParams } = useStudentParams();

  const isOpen = Boolean(studentViewId);
  if (!isOpen) return null;

  return (
    <CustomSheet
      floating
      rounded
      size="2xl"
      open={isOpen}
      onOpenChange={() => setParams(null)}
      sheetName="student-overview"
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <StudentOverviewSheetProvider args={[{ mode: "sheet" }]}>
          <CustomSheetContent className="flex flex-col gap-6">
            {/* <Sheet.Header>
              <Sheet.Title></Sheet.Title>
              <Sheet.Description></Sheet.Description>
            </Sheet.Header> */}
            <StudentOverviewShell mode="sheet" />
          </CustomSheetContent>
        </StudentOverviewSheetProvider>
      </Suspense>
    </CustomSheet>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="flex gap-4 border-b border-border py-3">
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
