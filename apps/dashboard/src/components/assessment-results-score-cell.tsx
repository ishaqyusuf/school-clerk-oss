"use client";

import {
  focusScoreCell,
  getScoreGridMove,
  parseScoreInput,
} from "@/components/assessment-recording/score-entry";
import { useScoreSaveReporter } from "@/components/assessment-recording/score-save-status";
import { cn } from "@school-clerk/ui/cn";
import { TableCell } from "@school-clerk/ui/table";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
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
  /** Grid position for keyboard entry (Enter/arrows move between cells). */
  gridRow?: number;
  gridCol?: number;
  /** Accessible name, e.g. "Student name, Exam (100)". */
  label?: string;
  /** Cell width classes; defaults to the compact 70px column. */
  widthClass?: string;
};

export const AssessmentResultsScoreCell = memo(function AssessmentResultsScoreCell({
  assessmentId,
  obtainable,
  studentTermFormId,
  studentId,
  departmentSubjectId,
  dividerClass,
  publicToken,
  result,
  gridRow,
  gridCol,
  label,
  widthClass = "w-[70px] min-w-[70px] max-w-[70px]",
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const canonicalValue =
    result?.obtained != null ? String(result.obtained) : "";
  const [localValue, setLocalValue] = useState<string>(canonicalValue);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPendingLocalValueRef = useRef(false);
  const lastCanonicalValueRef = useRef(canonicalValue);
  const reportSave = useScoreSaveReporter();
  const saveKey = `${studentTermFormId}:${assessmentId}`;
  const gridProps =
    gridRow != null && gridCol != null
      ? { "data-score-row": gridRow, "data-score-col": gridCol }
      : {};

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
    reportSave?.(saveKey, null);
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
      onError(_error, variables) {
        reportSaveFailure(variables ? variables.obtained ?? null : null);
      },
    }),
  );
  const publicScoreMutation = useMutation(
    _trpc.assessments.updatePublicAssessmentScore.mutationOptions({
      onSuccess(data) {
        handleSuccess(data, publicScoreMutation.reset);
      },
      onError(_error, variables) {
        reportSaveFailure(variables ? variables.obtained ?? null : null);
      },
    }),
  );
  const activeMutation = publicToken
    ? publicScoreMutation
    : authenticatedScoreMutation;
  const { error, isSuccess } = activeMutation;
  const errorBorderClassName = error ? "border border-destructive" : undefined;

  // Mutation-level callbacks survive unmount; per-call mutate callbacks do not.
  const reportSaveFailure = (obtained: number | null) => {
    reportSave?.(saveKey, {
      status: "failed",
      retry: () => saveScore(obtained),
    });
  };
  const saveScore = (obtained: number | null) => {
    reportSave?.(saveKey, { status: "saving" });
    if (publicToken) {
      publicScoreMutation.mutate(
        {
          id: result?.id,
          obtained,
          assessmentId,
          studentTermId: studentTermFormId,
          studentId: studentId ?? "",
          departmentSubjectId,
          token: publicToken,
        },
      );
      return;
    }

    authenticatedScoreMutation.mutate(
      {
        id: result?.id,
        obtained,
        assessmentId,
        studentTermId: studentTermFormId,
        studentId: studentId ?? "",
        departmentId: departmentSubjectId,
      },
    );
  };
  const handleSave = useDebouncedCallback(saveScore, 600);
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // A pending debounced save must not be dropped when the cell unmounts (subject or classroom switch).
  useEffect(() => {
    return () => {
      handleSaveRef.current.flush();
    };
  }, []);

  const updateValue = (value: string) => {
    setLocalValue(value);
    const parsed = parseScoreInput(value, obtainable);
    if (parsed.error) {
      handleSave.cancel();
      hasPendingLocalValueRef.current = true;
      setInvalidReason(parsed.error);
      reportSave?.(saveKey, null);
      return;
    }
    setInvalidReason(null);
    hasPendingLocalValueRef.current = true;
    reportSave?.(saveKey, { status: "saving" });
    handleSave(parsed.value);
  };

  const restoreSavedValue = () => {
    handleSave.cancel();
    hasPendingLocalValueRef.current = false;
    setInvalidReason(null);
    setLocalValue(canonicalValue);
    reportSave?.(saveKey, null);
  };

  const invalidClassName = invalidReason ? "text-destructive" : undefined;

  if (!isEditing) {
    return (
      <TableCell
        className={cn(
          widthClass,
          "cursor-pointer border-l p-0 text-center transition-colors hover:bg-accent/50",
          dividerClass,
          errorBorderClassName,
        )}
        onClick={() => setIsEditing(true)}
      >
        <div
          {...gridProps}
          role={gridRow != null ? "button" : undefined}
          tabIndex={gridRow != null ? 0 : undefined}
          aria-label={label}
          onFocus={() => setIsEditing(true)}
          className="flex h-full min-h-9 w-full items-center justify-center px-1 py-2 outline-none"
        >
          <span
            className={cn(
              "text-sm",
              localValue === "" && "text-muted-foreground",
              invalidClassName,
            )}
            title={invalidReason ?? undefined}
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
        widthClass,
        "border-l p-0 text-center",
        dividerClass,
        errorBorderClassName,
      )}
    >
      <div className="relative flex min-h-9 w-full items-center">
        <input
          {...gridProps}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={label}
          aria-invalid={Boolean(error) || Boolean(invalidReason)}
          title={invalidReason ?? undefined}
          className={cn(
            "h-9 w-full min-w-0 bg-transparent px-0 pr-5 text-center text-sm outline-none",
            "border-0 focus:bg-accent/40 focus:ring-0 focus-visible:ring-0",
            invalidClassName,
          )}
          value={localValue}
          onBlur={() => {
            setTimeout(() => setIsEditing(false), 200);
          }}
          onChange={(event) => updateValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              restoreSavedValue();
              return;
            }
            const move = getScoreGridMove(event.key, event.shiftKey);
            if (move && focusScoreCell(event.currentTarget, move)) {
              event.preventDefault();
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
});
