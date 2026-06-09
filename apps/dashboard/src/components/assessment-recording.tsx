"use client";
import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Card, DropdownMenu } from "@school-clerk/ui/composite";
import { enToAr } from "@school-clerk/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useAuth } from "@/hooks/use-auth";

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const auth = useAuth();
  const effectiveTermId = filters.termId ?? auth.profile?.termId ?? "";
  const canLoadSubjects = !!filters.deptId && !!effectiveTermId;
  const { data } = useQuery(
    _trpc.subjects.byClassroom.queryOptions(
      {
        departmentId: filters.deptId ?? "",
        sessionTermId: effectiveTermId,
      },
      {
        enabled: canLoadSubjects,
      },
    ),
  );
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
  const subjects = data?.subjects ?? [];
  const selectedDepartment = departments?.data?.find(
    (dept) => dept.id === filters.deptId,
  );
  const subject = subjects.find((s) => s.id === filters?.deptSubjectId);
  return (
    <>
      <div className="sm:mx-auto gap-4 px-4 sm:px-0 flex-col flex py-4 sm:max-w-4xl">
        <div className="fixed z-10 w-full sm:max-w-4xl top-0 border-b border-border">
          <Card.Header
            className="bg-background flex flex-row gap-4 items-center h-16"
            dir="rtl"
          >
            {!permissions.classrooms || (
              <DropdownMenu dir="rtl">
                <DropdownMenu.Trigger
                  dir="rtl"
                  className="flex rounded-xl border-border border items-center p-0.5 px-2 gap-2 w-min hover:bg-muted"
                >
                  <Card.Title className="whitespace-nowrap text-base">
                    {data?.departmentName ||
                      selectedDepartment?.displayName ||
                      "Select Classroom"}
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
            {!permissions.subjects || (
              <DropdownMenu dir="rtl">
                <DropdownMenu.Trigger
                  dir="rtl"
                  className="flex rounded-xl border-border border items-center p-0.5 px-2 gap-2 w-min hover:bg-muted"
                >
                  <Card.Description className="whitespace-nowrap font-medium text-foreground">
                    {subject?.subject?.title ||
                      (filters.deptId ? "Select Subject" : "Select Classroom")}
                  </Card.Description>
                  <div className="rounded-full size-4 p-0">
                    <ChevronDown className="size-4" />
                  </div>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  {!filters.deptId ? (
                    <DropdownMenu.Item disabled>
                      Select a classroom first
                    </DropdownMenu.Item>
                  ) : subjects.length ? (
                    subjects.map((s, i) => (
                      <DropdownMenu.Item
                        onSelect={() => setFilters({ deptSubjectId: s.id })}
                        dir="rtl"
                        key={s.id}
                      >
                        <>
                          {enToAr(i + 1)}.{s.subject?.title} |{" "}
                          {s.submissionPercentage}%
                        </>
                      </DropdownMenu.Item>
                    ))
                  ) : (
                    <DropdownMenu.Item disabled>
                      No subjects found
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu>
            )}
            {!permissions.all || (
              <Link
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
