"use client";
import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Card, DropdownMenu, Field, Select } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useAuth } from "@/hooks/use-auth";

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const auth = useAuth();
  const effectiveTermId = filters.termId ?? auth.profile?.termId ?? "";
  const { data: terms, isLoading: isLoadingTerms } = useQuery(
    _trpc.academics.getReportTerms.queryOptions(),
  );
  const { data: departments, isLoading: isLoadingDepartments } = useQuery(
    _trpc.classrooms.all.queryOptions(
      {
        sessionTermId: effectiveTermId,
      },
      {
        enabled: !!effectiveTermId && permissions.classrooms,
      },
    ),
  );
  const selectedDepartment = departments?.data?.find(
    (dept) => dept.id === filters.deptId,
  );
  const needsSetup = !filters.deptId || !effectiveTermId;

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
            {permissions.all && filters.deptId && effectiveTermId ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                href={`/student-report?deptId=${filters.deptId}&permission=all&termId=${effectiveTermId}`}
              >
                Report Sheet
              </Link>
            ) : null}
          </Card.Header>
        </div>
        <div className="mt-16 mb-28">
          {!needsSetup ? (
            <AssessmentRecordingResultsTable
              departmentId={filters.deptId}
              termId={effectiveTermId}
              selectedSubjectId={filters.deptSubjectId}
            />
          ) : (
            <div className="mx-auto mt-8 max-w-xl rounded-lg border border-border bg-background p-4 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base font-semibold">
                  Select assessment context
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a term and classroom to continue.
                </p>
              </div>
              <Field.Group className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Field.Label>Term</Field.Label>
                  <Select
                    value={effectiveTermId || undefined}
                    onValueChange={(termId) => {
                      setFilters({
                        termId: termId || null,
                        deptId: null,
                        deptSubjectId: null,
                      });
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={
                          isLoadingTerms ? "Loading terms..." : "Select term"
                        }
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {terms?.map((term) => (
                        <Select.Item value={term.id} key={term.id}>
                          {term.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Field>
                {!permissions.classrooms || (
                  <Field>
                    <Field.Label>Classroom</Field.Label>
                    <Select
                      dir="rtl"
                      value={filters.deptId || undefined}
                      disabled={!effectiveTermId || isLoadingDepartments}
                      onValueChange={(deptId) => {
                        setFilters({
                          deptId,
                          deptSubjectId: null,
                          termId: effectiveTermId || null,
                        });
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value
                          placeholder={
                            !effectiveTermId
                              ? "Select term first"
                              : isLoadingDepartments
                                ? "Loading classrooms..."
                                : "Select classroom"
                          }
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {departments?.data?.map((dept) => (
                          <Select.Item value={dept.id} key={dept.id}>
                            {dept.displayName ?? dept.departmentName}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Field>
                )}
              </Field.Group>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
