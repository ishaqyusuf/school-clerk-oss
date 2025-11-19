"use client";
import { StudentReportFilter } from "@/components/student-report-filters";
import { StudentReportPage } from "@/components/student-report-page";
import {
  createReportPageContext,
  ReportPageProvider,
} from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { useReportStore } from "@/store/report";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Sheet } from "@school-clerk/ui/composite";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function Page() {
  const { filters, setFilters } = useStudentReportFilterParams();
  const [width, height] = [595, 842];
  const store = useReportStore();
  const studentIds = Object.entries(store?.selection)
    ?.filter(([a, b]) => b)
    ?.map(([a, b]) => a);
  const [menuOpened, setMenuOpened] = useState(false);
  return (
    <ReportPageProvider value={createReportPageContext()}>
      <div className={cn("lg:flex print:hidden")}>
        <div className="hidden lg:block  lg:w-56 border lg:h-screen p-2 overflow-auto">
          <StudentReportFilter />
        </div>
        <div className="min-h-screen  flex-1 lg:h-screen overflow-auto mx-auto lg:max-w-4xl  flex flex-col">
          <div className="flex flex-col justify-center items-center  dotted-bg p-4 lg:p-6 xl:p-0">
            <div className="h-16 lg:hidden fixed flex items-center top-0 border-border gap-4 border-b w-full">
              <Button onClick={(e) => setMenuOpened(true)} size="sm">
                <Menu className="size-4" />
              </Button>
            </div>
            <div
              className="flex flex-col w-full py-6"
              // style={{ maxWidth: width }}
            >
              <div className="pb-24  lg:pb-0">
                {studentIds?.map((studentId) => (
                  <div
                    key={studentId}
                    className="shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
                  >
                    <StudentReportPage studentId={studentId} />
                  </div>
                ))}
              </div>
            </div>
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
      <div className="hidden  flex-col print:flex">
        {studentIds?.map((studentId) => (
          <StudentReportPage studentId={studentId} key={studentId} />
        ))}
      </div>
    </ReportPageProvider>
  );
}
