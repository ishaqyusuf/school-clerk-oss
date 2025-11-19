"use client";
import { AssessmentSubmissions } from "@/components/asessment-submissions";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { constructMetadata } from "@/utils/construct-metadata";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  DropdownMenu,
  InputGroup,
  Select,
} from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

export function AssessmentRecording() {
  const { filters, setFilters } = useAssessmentRecordingParams();
  const { data } = useQuery(
    _trpc.subjects.byClassroom.queryOptions(
      {
        departmentId: filters?.deptId,
      },
      {
        enabled: filters.permission === "classroom",
      }
    )
  );
  if (!data) return null;
  const { subjects, ...department } = data;
  const subject = subjects.find((s) => s.id === filters?.deptSubjectId);
  return (
    <>
      <div className="sm:mx-auto gap-4 px-4 sm:px-0 flex-col flex py-4 sm:max-w-4xl">
        <div className="fixed w-full border-b border-border">
          <Card.Header className="bg-background " dir="rtl">
            <Card.Title>{department?.departmentName}</Card.Title>

            <DropdownMenu dir="rtl">
              <DropdownMenu.Trigger dir="rtl" className="flex gap-2 w-[56px]">
                <Card.Description>{subject?.subject?.title}</Card.Description>
                <Button className="rounded-full size-4 p-0">
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                {subjects?.map((s) => (
                  <DropdownMenu.Item
                    onClick={(e) => {
                      setFilters({
                        deptSubjectId: s.id,
                      });
                    }}
                    dir="rtl"
                    key={s.id}
                  >
                    <>{s.subject?.title}</>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          </Card.Header>
        </div>
        <AssessmentSubmissions deparmentSubjectId={filters.deptSubjectId} />
      </div>
    </>
  );
}
