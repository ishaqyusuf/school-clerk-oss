"use client";

import { cn } from "@school-clerk/ui/cn";
import { TableCell } from "@school-clerk/ui/table";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  obtainable: number | null;
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
  const canonicalValue =
    result?.obtained != null ? String(result.obtained) : "";
  const [localValue, setLocalValue] = useState<string>(canonicalValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPendingLocalValueRef = useRef(false);
  const lastCanonicalValueRef = useRef(canonicalValue);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  useEffect(() => {
    if (canonicalValue === lastCanonicalValueRef.current) return;

    lastCanonicalValueRef.current = canonicalValue;
    if (!hasPendingLocalValueRef.current) {
      setLocalValue(canonicalValue);
    }
  }, [canonicalValue]);

  const handleSuccess = (
    data: { obtained?: number | null },
    resetMutation: () => void,
  ) => {
    hasPendingLocalValueRef.current = false;
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
  const { error, isSuccess } = activeMutation;
  const errorBorderClassName = error ? "border border-destructive" : undefined;

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
          errorBorderClassName,
        )}
        onClick={() => setIsEditing(true)}
      >
        <div className="flex h-full min-h-9 w-full items-center justify-center px-1 py-2">
          <span
            className={cn(
              "text-sm",
              localValue === "" && "text-muted-foreground",
            )}
          >
            {localValue !== "" ? localValue : "-"}
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
        errorBorderClassName,
      )}
    >
      <div className="relative flex min-h-9 w-full items-center">
        <input
          ref={inputRef}
          type="number"
          aria-invalid={Boolean(error)}
          className={cn(
            "h-9 w-full min-w-0 bg-transparent px-0 pr-5 text-center text-sm outline-none",
            "border-0 focus:bg-accent/40 focus:ring-0 focus-visible:ring-0",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            obtainable != null &&
              +localValue > obtainable &&
              "text-destructive",
          )}
          defaultValue={localValue}
          onBlur={() => {
            setTimeout(() => setIsEditing(false), 200);
          }}
          onChange={(event) => {
            hasPendingLocalValueRef.current = true;
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
        {isSuccess ? (
          <div className="pointer-events-none absolute right-1 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center">
            <Check className="size-3 text-green-500" />
          </div>
        ) : null}
      </div>
    </TableCell>
  );
}
