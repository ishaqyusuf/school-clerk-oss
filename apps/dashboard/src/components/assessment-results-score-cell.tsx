"use client";

import { cn } from "@school-clerk/ui/cn";
import { Spinner } from "@school-clerk/ui/spinner";
import { TableCell } from "@school-clerk/ui/table";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { _qc, _trpc } from "./static-trpc";

type ScoreResult = {
  id?: number | null;
  obtained?: number | null;
  percentageScore?: number | null;
  studentTermFormId?: string | null;
  studentId?: string | null;
};

type Props = {
  assessmentId: number;
  obtainable: number;
  studentTermFormId: string;
  studentId: string | undefined;
  departmentSubjectId: string;
  dividerClass?: string;
  publicToken?: string | null;
  result?: ScoreResult | null;
};

export function AssessmentResultsScoreCell({
  assessmentId,
  obtainable,
  studentTermFormId,
  studentId,
  departmentSubjectId,
  dividerClass,
  publicToken,
  result,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(
    result?.obtained != null ? String(result.obtained) : "",
  );
  const displayValue = useDeferredValue(localValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const handleSuccess = (
    data: { obtained?: number | null },
    resetMutation: () => void,
  ) => {
    setLocalValue(data.obtained != null ? String(data.obtained) : "");
    if (publicToken) {
      _qc.invalidateQueries({
        queryKey: _trpc.assessments.getPublicAssessmentLink.queryKey({
          token: publicToken,
        }),
      });
    } else {
      _qc.invalidateQueries({
        queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
      });
      _qc.invalidateQueries({
        queryKey: _trpc.assessments.getSubjectAssessmentRecordings.queryKey({}),
      });
    }
    setTimeout(() => {
      resetMutation();
    }, 1500);
  };
  const authenticatedScoreMutation = useMutation(
    _trpc.assessments.updateAssessmentScore.mutationOptions({
      onSuccess(data) {
        handleSuccess(data, authenticatedScoreMutation.reset);
      },
    }),
  );
  const publicScoreMutation = useMutation(
    _trpc.assessments.updatePublicAssessmentScore.mutationOptions({
      onSuccess(data) {
        handleSuccess(data, publicScoreMutation.reset);
      },
    }),
  );
  const activeMutation = publicToken
    ? publicScoreMutation
    : authenticatedScoreMutation;
  const { isPending, isSuccess, error } = activeMutation;

  const handleSave = useDebouncedCallback((value: string) => {
    const numValue = value ? +value : null;
    if (publicToken) {
      publicScoreMutation.mutate({
        id: result?.id,
        obtained: numValue,
        assessmentId,
        studentTermId: studentTermFormId,
        studentId: studentId ?? "",
        departmentSubjectId,
        token: publicToken,
      });
      return;
    }

    authenticatedScoreMutation.mutate({
      id: result?.id,
      obtained: numValue,
      assessmentId,
      studentTermId: studentTermFormId,
      studentId: studentId ?? "",
      departmentId: departmentSubjectId,
    });
  }, 600);

  if (!isEditing) {
    return (
      <TableCell
        className={cn(
          "w-[70px] min-w-[70px] max-w-[70px] cursor-pointer border-l p-0 text-center transition-colors hover:bg-accent/50",
          dividerClass,
        )}
        onClick={() => setIsEditing(true)}
      >
        <div className="flex h-full min-h-9 w-full items-center justify-center px-1 py-2">
          <span
            className={cn(
              "text-sm",
              result?.obtained == null && "text-muted-foreground",
            )}
          >
            {result?.obtained != null ? result.obtained : "-"}
          </span>
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell
      className={cn(
        "w-[70px] min-w-[70px] max-w-[70px] border-l p-0 text-center",
        dividerClass,
      )}
    >
      <div className="relative flex min-h-9 w-full items-center">
        <input
          ref={inputRef}
          type="number"
          className={cn(
            "h-9 w-full min-w-0 bg-transparent px-0 pr-5 text-center text-sm outline-none",
            "border-0 focus:bg-accent/40 focus:ring-0 focus-visible:ring-0",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            +displayValue > obtainable && "text-destructive",
          )}
          defaultValue={displayValue}
          onBlur={() => {
            setTimeout(() => setIsEditing(false), 200);
          }}
          onChange={(event) => {
            setLocalValue(event.target.value);
            handleSave(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsEditing(false);
            }
          }}
          placeholder="-"
        />
        <div className="pointer-events-none absolute right-1 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center">
          {isPending ? (
            <Spinner size={12} />
          ) : error ? (
            <AlertCircle className="text-destructive size-3" />
          ) : isSuccess ? (
            <Check className="text-green-500 size-3" />
          ) : null}
        </div>
      </div>
    </TableCell>
  );
}
