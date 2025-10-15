import { useStudentParams } from "@/hooks/use-student-params";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { StudentOverviewSheetHeader } from "../students/student-overview-sheet-header";
import { StudentOverview } from "../students/student-overview";
import { StudentAcademicsOverview } from "../students/student-academics-overview";
import {
  StudentOverviewSheetProvider,
  useStudentOverviewSheet,
} from "@/hooks/use-student-overview-sheet";
import { Menu } from "../menu";
import { Button } from "@school-clerk/ui/button";
import { Label } from "@school-clerk/ui/label";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Suspense } from "react";
import { Skeleton } from "@school-clerk/ui/skeleton";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { StudentTransactionOverview } from "../students/student-transaction-overview";

export function StudentOverviewSheet({}) {
  const { studentViewId, setParams } = useStudentParams();
  // const { overviewData, isOpen } = useStudentOverviewSheet();

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
      {/* <LoadingSkeleton /> */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StudentOverviewSheetProvider>
          <Content />
        </StudentOverviewSheetProvider>
      </Suspense>
    </CustomSheet>
  );
}
export function Content({}) {
  const { studentViewTab, setParams } = useStudentParams();
  const { overviewData, isOpen } = useStudentOverviewSheet();
  if (!isOpen) return null;

  return (
    <>
      <Tabs
        className="hidden sm:block"
        onValueChange={(e) => {
          setParams({
            studentViewTab: e,
          });
        }}
        defaultValue="academics"
        value={studentViewTab || "academics"}
      >
        <StudentOverviewSheetHeader overview={overviewData} />
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="sm:hidden">
        <Menu
          Trigger={
            <Button variant="outline" className="w-full text-start">
              <div className="flex w-full items-center gap-4">
                <Label>Tab:</Label>
                <Label>Academics</Label>
                <div className="flex-1"></div>
                <Icons.chevronDown className="size-4" />
              </div>
            </Button>
          }
        >
          <Menu.Item>Overview</Menu.Item>
          <Menu.Item>Academics</Menu.Item>
          <Menu.Item>Attendance</Menu.Item>
          <Menu.Item>Finance</Menu.Item>
        </Menu>
      </div>
      <CustomSheetContent className="flex flex-col gap-2">
        <Tabs defaultValue="overview" value={studentViewTab || "academics"}>
          <TabsContent value="overview" className="h-screen bg-gray-100">
            <StudentOverview />
          </TabsContent>
          <TabsContent value="academics" className="h-screen">
            <StudentAcademicsOverview />
          </TabsContent>
          <TabsContent value="finance" className="h-screen">
            <StudentTransactionOverview />
          </TabsContent>
        </Tabs>
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
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-8 col-span-1" />
            <Skeleton className="h-8 col-span-2" />
            <div className=""></div>
          </div>
        </SheetDescription>
      </SheetHeader>
      <div className="grid grid-cols-6 gap-4">
        <div className=""></div>
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <div className=""></div>

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />

        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />
      </div>
    </>
  );
}
