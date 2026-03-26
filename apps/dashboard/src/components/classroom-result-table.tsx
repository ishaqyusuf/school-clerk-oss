"use client";

import { useReportPageContext } from "@/hooks/use-report-page";
import { studentDisplayName } from "@/utils/utils";
import { cn } from "@school-clerk/ui/cn";
import { Spinner } from "@school-clerk/ui/spinner";
import { sum } from "@school-clerk/utils";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, Tangent } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { _qc, _trpc } from "./static-trpc";
import { Table } from "@school-clerk/ui/composite";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

export function ClassroomResultTable() {
  const ctx = useReportPageContext();
  const reportData = ctx.reportData;

  const allSubjects = reportData?.subjects ?? [];
  const students = reportData?.studentTermForms ?? [];

  // Hide assessment columns where no student has a valid (non-null) score,
  // and hide entire subject groups if all their assessments are hidden.
  const visibleSubjects = useMemo(() => {
    return allSubjects
      .map((subj) => ({
        ...subj,
        assessments: subj.assessments.filter((asmt) =>
          asmt.assessmentResults.some((r) => r.obtained !== null),
        ),
      }))
      .filter((subj) => subj.assessments.length > 0);
  }, [allSubjects]);

  if (!visibleSubjects.length || !students.length) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No result data available. Select a classroom with assessment records.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              rowSpan={2}
              className="sticky left-0 z-10 bg-background border-r min-w-[40px] text-center"
            >
              #
            </TableHead>
            <TableHead
              rowSpan={2}
              className="sticky left-[40px] z-10 bg-background border-r min-w-[160px]"
              dir="rtl"
            >
              Student
            </TableHead>
            {visibleSubjects.map((subject) => (
              <TableHead
                key={subject.id}
                colSpan={subject.assessments.length + 1}
                className="text-center border-l font-semibold"
                dir="rtl"
              >
                {subject.subject.title}
              </TableHead>
            ))}
            <TableHead
              rowSpan={2}
              className="text-center border-l font-semibold min-w-[60px]"
            >
              Total
            </TableHead>
            <TableHead
              rowSpan={2}
              className="text-center border-l font-semibold min-w-[50px]"
            >
              %
            </TableHead>
          </TableRow>
          <TableRow>
            {visibleSubjects.map((subject) => (
              <Fragment key={subject.id}>
                {subject.assessments.map((assessment) => (
                  <TableHead
                    key={`${subject.id}-${assessment.id}`}
                    className="text-center border-l text-xs min-w-[70px]"
                  >
                    <div>{assessment.title}</div>
                    <div className="text-muted-foreground">
                      ({assessment.obtainable})
                    </div>
                  </TableHead>
                ))}
                <Table.Head className="text-center border-l text-xs font-semibold min-w-[60px]">
                  Total
                </Table.Head>
              </Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student, si) => (
            <StudentResultRow
              key={student.id}
              student={student}
              subjects={visibleSubjects}
              index={si}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface StudentResultRowProps {
  student: {
    id: string;
    student: {
      id: string;
      gender: string | null;
      name: string | null;
      otherName: string | null;
      surname: string | null;
    } | null;
  };
  subjects: Array<{
    id: string;
    assessments: Array<{
      id: number;
      title: string;
      obtainable: number;
      percentageObtainable: number | null;
      index: number | null;
      assessmentResults: Array<{
        id: number;
        obtained: number | null;
        percentageScore: number | null;
        studentTermFormId: string | null;
        studentId: string | null;
      }>;
    }>;
    subject: { title: string };
  }>;
  index: number;
}

function StudentResultRow({ student, subjects, index }: StudentResultRowProps) {
  const subjectTotals = useMemo(() => {
    return subjects.map((subject) => {
      let subjectTotal = 0;
      const assessmentScores = subject.assessments.map((assessment) => {
        const result = assessment.assessmentResults.find(
          (r) => r.studentTermFormId === student.id,
        );
        const obtained = result?.obtained ?? null;
        if (obtained !== null) {
          const percentageObtainable = assessment.percentageObtainable;
          const score =
            percentageObtainable &&
            percentageObtainable !== assessment.obtainable
              ? (obtained / assessment.obtainable) * percentageObtainable
              : obtained;
          subjectTotal += score;
        }
        return { obtained, result };
      });
      return { subjectTotal, assessmentScores };
    });
  }, [subjects, student.id]);

  let grandTotal = 0;
  subjectTotals.forEach((st) => {
    grandTotal += st.subjectTotal;
  });

  const totalObtainable = subjects.reduce(
    (acc, subject) =>
      acc +
      sum(
        subject.assessments.map((a) => a.percentageObtainable || a.obtainable),
      ),
    0,
  );

  const percentage =
    totalObtainable > 0
      ? +((grandTotal / totalObtainable) * 100).toFixed(1)
      : 0;

  return (
    <TableRow>
      <TableCell className="sticky left-0 z-10 bg-background border-r text-center text-muted-foreground text-sm">
        {index + 1}
      </TableCell>
      <TableCell
        className="sticky left-[40px] z-10 bg-background border-r whitespace-nowrap"
        dir="rtl"
      >
        {studentDisplayName(student.student)}
      </TableCell>
      {subjects.map((subject, si) => {
        const { subjectTotal, assessmentScores } = subjectTotals[si];
        return (
          <Fragment key={subject.id}>
            {subject.assessments.map((assessment, ai) => {
              const { result } = assessmentScores[ai];
              return (
                <ScoreCell
                  key={`${student.id}-${assessment.id}`}
                  assessmentId={assessment.id}
                  obtainable={assessment.obtainable}
                  studentTermFormId={student.id}
                  studentId={student.student?.id}
                  departmentSubjectId={subject.id}
                  result={result}
                />
              );
            })}
            <TableCell className="text-center border-l font-medium text-sm">
              {subjectTotal > 0 ? subjectTotal.toFixed(1) : "-"}
            </TableCell>
          </Fragment>
        );
      })}
      <TableCell className="text-center border-l font-semibold">
        {grandTotal > 0 ? grandTotal.toFixed(1) : "-"}
      </TableCell>
      <TableCell className="text-center border-l font-semibold">
        {percentage > 0 ? `${percentage}%` : "-"}
      </TableCell>
    </TableRow>
  );
}

interface ScoreCellProps {
  assessmentId: number;
  obtainable: number;
  studentTermFormId: string;
  studentId: string | undefined;
  departmentSubjectId: string;
  result:
    | {
        id: number;
        obtained: number | null;
        percentageScore: number | null;
        studentTermFormId: string | null;
        studentId: string | null;
      }
    | null
    | undefined;
}

function ScoreCell({
  assessmentId,
  obtainable,
  studentTermFormId,
  studentId,
  departmentSubjectId,
  result,
}: ScoreCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(
    result?.obtained != null ? String(result.obtained) : "",
  );
  const displayValue = useDeferredValue(localValue);

  const { isPending, mutate, isSuccess, error, reset } = useMutation(
    _trpc.assessments.updateAssessmentScore.mutationOptions({
      onSuccess(data) {
        setLocalValue(data.obtained != null ? String(data.obtained) : "");
        _qc.invalidateQueries({
          queryKey: _trpc.assessments.getClassroomReportSheet.queryKey({}),
        });
        setTimeout(() => {
          reset();
        }, 1500);
      },
    }),
  );

  const handleSave = useDebouncedCallback((value: string) => {
    const numValue = value ? +value : null;
    mutate({
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
          "text-center border-l cursor-pointer hover:bg-accent/50 transition-colors min-w-[70px] p-0",
        )}
        onClick={() => setIsEditing(true)}
      >
        <div className="flex items-center justify-center h-full py-2 px-1">
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
    <TableCell className="text-center border-l p-0 min-w-[70px]">
      <div className="flex items-center gap-1">
        <input
          type="number"
          autoFocus
          className={cn(
            "w-full h-8 text-center text-sm bg-transparent border-0 outline-none",
            "focus:ring-1 focus:ring-primary rounded",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            +displayValue > obtainable && "text-destructive",
          )}
          defaultValue={displayValue}
          onBlur={() => {
            setTimeout(() => setIsEditing(false), 200);
          }}
          onChange={(e) => {
            setLocalValue(e.target.value);
            handleSave(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsEditing(false);
            }
          }}
          placeholder="-"
        />
        <div className="w-4 mr-1">
          {isPending ? (
            <Spinner className="size-3" />
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
