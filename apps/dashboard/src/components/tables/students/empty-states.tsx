"use client";

import { useStudentParams } from "@/hooks/use-student-params";

import { Button } from "@school-clerk/ui/button";

type EmptyStateProps = {
  onCreate?: () => void;
};

export function EmptyState({ onCreate }: EmptyStateProps) {
  const { setParams } = useStudentParams();

  return (
    <div className="flex items-center justify-center ">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No students</h2>
          <p className="text-sm text-[#606060]">
            No student records are available yet. <br />
            Enroll a student or import an existing roster.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            if (onCreate) {
              onCreate();
              return;
            }

            setParams({
              createStudent: true,
            });
          }}
        >
          Enroll student
        </Button>
      </div>
    </div>
  );
}

type NoResultsProps = {
  onClear?: () => void;
};

export function NoResults({ onClear }: NoResultsProps) {
  const q = useStudentParams();
  return (
    <div className="flex items-center justify-center ">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="text-sm text-[#606060]">
            Try another search, or adjusting the filters
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            if (onClear) {
              onClear();
              return;
            }

            q.setParams(null);
          }}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
