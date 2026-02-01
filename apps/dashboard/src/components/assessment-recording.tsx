"use client";
import { AssessmentSubmissions } from "@/components/asessment-submissions";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Card, DropdownMenu } from "@school-clerk/ui/composite";
import { Menu } from "@school-clerk/ui/custom/menu";
import { enToAr } from "@school-clerk/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const { data } = useQuery(
    _trpc.subjects.byClassroom.queryOptions(
      {
        departmentId: filters?.deptId,
        sessionTermId: filters?.termId,
      },
      {
        // enabled: permissions.subjects && !!filters?.deptId,
      },
    ),
  );
  const { data: departments } = useQuery(
    _trpc.classrooms.all.queryOptions(
      {
        sessionTermId: filters.termId,
      },
      {
        // enabled: permissions.classrooms,
      },
    ),
  );
  if (!data) return null;
  const { subjects, ...department } = data;
  const subject = subjects.find((s) => s.id === filters?.deptSubjectId);
  return (
    <>
      <div className="sm:mx-auto gap-4 px-4 sm:px-0 flex-col flex py-4 sm:max-w-4xl">
        <div className="fixed w-full sm:max-w-4xl top-0 border-b border-border">
          <Card.Header
            className="bg-background flex flex-row gap-4 items-center h-16"
            dir="rtl"
          >
            {!permissions.classrooms || (
              <>
                <Menu>
                  {departments?.data?.map((dept) => (
                    <Menu.Item
                      onClick={(e) => {
                        setFilters({
                          deptId: dept.id,
                        });
                      }}
                      dir="rtl"
                      key={dept?.id}
                    >
                      {dept?.displayName}
                    </Menu.Item>
                  ))}
                </Menu>
              </>
            )}
            <Card.Title>{department?.departmentName}</Card.Title>
            {/* <Separator orientation="vertical" className="h-full" /> */}
            {!permissions.subjects || (
              <DropdownMenu dir="rtl">
                <DropdownMenu.Trigger
                  dir="rtl"
                  className="flex rounded-xl border-border border items-center p-0.5 px-2 gap-2 w-[56px]s  w-min "
                >
                  <Card.Description className="whitespace-nowrap">
                    {subject?.subject?.title}
                  </Card.Description>
                  <div className="rounded-full size-4 p-0">
                    <ChevronDown className="size-4" />
                  </div>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  {subjects?.map((s, i) => (
                    <DropdownMenu.Item
                      onClick={(e) => {
                        setFilters({
                          deptSubjectId: s.id,
                        });
                      }}
                      dir="rtl"
                      key={s.id}
                    >
                      <>
                        {enToAr(i + 1)}.{s.subject?.title} |{" "}
                        {s.submissionPercentage}%
                      </>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu>
            )}
            {!permissions.all || (
              <Link
                target="_blank"
                href={`/student-report?deptId=${filters.deptId}&permission=all&termId=${filters.termId}`}
              >
                Report Sheet
              </Link>
            )}
          </Card.Header>
        </div>
        <div className="mt-16 mb-28">
          <AssessmentSubmissions deparmentSubjectId={filters.deptSubjectId} />
        </div>
      </div>
    </>
  );
}
