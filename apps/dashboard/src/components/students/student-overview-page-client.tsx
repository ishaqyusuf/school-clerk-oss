"use client";

import { StudentOverviewSheetProvider } from "@/hooks/use-student-overview-sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@school-clerk/ui/breadcrumb";
import { usePathname, useRouter } from "next/navigation";
import { StudentOverviewShell } from "./student-overview-shell";

type Props = {
  studentId: string;
};

export function StudentOverviewPageClient({ studentId }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const studentsBasePath = pathname.split("/").slice(0, -1).join("/");
  const studentsListPath = `${studentsBasePath}/list`;

  return (
    <StudentOverviewSheetProvider
      args={[
        {
          mode: "page",
          studentId,
          onStudentSelect(nextStudentId) {
            router.push(`${studentsBasePath}/${nextStudentId}`);
          },
        },
      ]}
    >
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => router.push(studentsListPath)}
              >
                Students
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Student Overview</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <StudentOverviewShell mode="page" />
      </div>
    </StudentOverviewSheetProvider>
  );
}
