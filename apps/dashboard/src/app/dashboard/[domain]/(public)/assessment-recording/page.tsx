"use client";
import { AssessmentSubmissions } from "@/components/asessment-submissions";
import { _trpc } from "@/components/static-trpc";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { InputGroup, Select } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";

export default function AssessmentRecording() {
  const { filters, setFilters } = useAssessmentRecordingParams();
  const { data: subjects } = useQuery(
    _trpc.subjects.byClassroom.queryOptions(
      {
        departmentId: filters?.deptId,
      },
      {
        enabled: filters.permission === "classroom",
      }
    )
  );
  return (
    <>
      <div className="sm:mx-auto gap-4 flex-col flex py-4 sm:max-w-4xl">
        <div className="flex">
          <div className="flex-1"></div>
          <InputGroup>
            <InputGroup.Addon>Subject:</InputGroup.Addon>
            <Select.Root
              dir="rtl"
              onValueChange={(e) => {
                console.log(e);
                setFilters({
                  deptSubjectId: e,
                });
              }}
              value={filters.deptSubjectId}
            >
              <Select.Trigger value={filters.deptSubjectId} />
              <Select.Content>
                {subjects?.map((s) => (
                  <Select.Item value={s.id} key={s.id}>
                    {s.subject?.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </InputGroup>
        </div>
        <AssessmentSubmissions deparmentSubjectId={filters.deptSubjectId} />
      </div>
    </>
  );
}
