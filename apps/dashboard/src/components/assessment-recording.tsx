"use client";
import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Card, DropdownMenu } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useAuth } from "@/hooks/use-auth";

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const auth = useAuth();
  const effectiveTermId = filters.termId ?? auth.profile?.termId ?? "";
  const { data: departments } = useQuery(
    _trpc.classrooms.all.queryOptions(
      {
        sessionTermId: effectiveTermId || filters.termId,
      },
      {
        // enabled: permissions.classrooms,
      },
    ),
  );
  const selectedDepartment = departments?.data?.find(
    (dept) => dept.id === filters.deptId,
  );
  return (
    <>
      <div className="flex flex-col gap-4 px-2 py-3 sm:mx-auto sm:max-w-4xl sm:px-0 sm:py-4">
        <div className="fixed inset-x-0 top-0 z-10 border-b border-border bg-background sm:left-1/2 sm:w-full sm:max-w-4xl sm:-translate-x-1/2">
          <Card.Header
            className="flex min-h-16 flex-wrap items-center gap-3 bg-background px-3 py-2 sm:flex-nowrap sm:px-6"
            dir="rtl"
          >
            {!permissions.classrooms || (
              <DropdownMenu dir="rtl">
                <DropdownMenu.Trigger
                  dir="rtl"
                  className="flex max-w-full items-center gap-2 rounded-xl border border-border px-2 py-1 hover:bg-muted"
                >
                  <Card.Title className="max-w-[70vw] truncate text-base sm:max-w-xs">
                    {selectedDepartment?.displayName || "Select Classroom"}
                  </Card.Title>
                  <div className="rounded-full size-4 p-0">
                    <ChevronDown className="size-4" />
                  </div>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  {departments?.data?.map((dept) => (
                    <DropdownMenu.Item
                      onSelect={() =>
                        setFilters({
                          deptId: dept.id,
                          deptSubjectId: null,
                          termId: effectiveTermId || null,
                        })
                      }
                      dir="rtl"
                      key={dept?.id}
                    >
                      {dept?.departmentName}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu>
            )}
            {!permissions.all || (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                href={`/student-report?deptId=${filters.deptId}&permission=all&termId=${effectiveTermId}`}
              >
                Report Sheet
              </Link>
            )}
          </Card.Header>
        </div>
        <div className="mt-16 mb-28">
          {filters.deptId && effectiveTermId ? (
            <AssessmentRecordingResultsTable
              departmentId={filters.deptId}
              termId={effectiveTermId}
              selectedSubjectId={filters.deptSubjectId}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Please select a classroom to view and record assessments.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
