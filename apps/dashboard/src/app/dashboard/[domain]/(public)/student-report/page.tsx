"use client";
import { ClassroomResultTable } from "@/components/classroom-result-table";
import { StudentReportFilter } from "@/components/student-report-filters";
import { StudentReportPage } from "@/components/student-report-page";
import {
  createReportPageContext,
  ReportPageProvider,
  useReportPageContext,
} from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Sheet } from "@school-clerk/ui/composite";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@school-clerk/ui/tabs";
import { FileText, Menu, TableIcon } from "lucide-react";
import { useMemo, useState } from "react";

export default function Page() {
  const { filters, setFilters } = useStudentReportFilterParams();
  const [menuOpened, setMenuOpened] = useState(false);
  return (
    <ReportPageProvider value={createReportPageContext()}>
      <div className={cn("lg:flex print:hidden")}>
        <div className="hidden lg:block lg:w-56 border lg:h-screen p-2 overflow-auto">
          <StudentReportFilter />
        </div>
        <div className="min-h-screen flex-1 lg:h-screen overflow-auto flex flex-col">
          <div className="h-16 lg:hidden fixed flex items-center top-0 border-border gap-4 border-b w-full z-20 bg-background px-2">
            <Button onClick={() => setMenuOpened(true)} size="sm">
              <Menu className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col flex-1">
            <Tabs
              value={filters.tab}
              onValueChange={(v) =>
                setFilters({ tab: v as "print" | "classroom-results" })
              }
              className="flex flex-col flex-1"
            >
              <div className="sticky top-0 z-10 bg-background border-b px-4 pt-2 lg:pt-0">
                <TabsList className="w-full sm:w-auto rounded-lg">
                  <TabsTrigger
                    value="print"
                    className="flex items-center gap-2 rounded-md"
                  >
                    <FileText className="size-4" />
                    Print View
                  </TabsTrigger>
                  <TabsTrigger
                    value="classroom-results"
                    className="flex items-center gap-2 rounded-md"
                  >
                    <TableIcon className="size-4" />
                    Classroom Results
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="print" className="flex-1 mt-0">
                <div className="flex flex-col justify-center items-center dotted-bg p-4 lg:p-6 xl:p-0">
                  <div className="flex flex-col w-full py-6 mx-auto lg:max-w-4xl">
                    <div className="pb-24 lg:pb-0">
                      <Reports />
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="classroom-results" className="flex-1 mt-0 p-4">
                <ClassroomResultTable />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="lg:hidden">
          <Sheet
            open={menuOpened}
            onOpenChange={(e) => {
              setMenuOpened(e);
            }}
          >
            <Sheet.Header>
              <Sheet.Title></Sheet.Title>
              <Sheet.Description></Sheet.Description>
            </Sheet.Header>
            <Sheet.Content className="p-2 h-screen gap-4 overflow-auto">
              <StudentReportFilter />
            </Sheet.Content>
          </Sheet>
        </div>
      </div>
      <div className="hidden flex-col print:flex">
        <Reports printMode />
      </div>
    </ReportPageProvider>
  );
}
function Reports({ printMode = false }) {
  const ctx = useReportPageContext();
  const { filters } = useStudentReportFilterParams();
  const studentIds = useMemo(() => {
    if (!ctx.termForms) return [];
    return ctx.termForms
      .filter((_, i) => filters.selections?.includes(i))
      .map((a) => a.id);
  }, [filters.selections, ctx.termForms]);
  return (
    <>
      {studentIds?.map((studentId, i) => (
        <div
          key={studentId}
          className={cn(
            !printMode
              ? "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
              : "",
            i > 0 && printMode && "break-before-page "
          )}
        >
          <StudentReportPage studentId={studentId} key={studentId} />
        </div>
      ))}
    </>
  );
}
