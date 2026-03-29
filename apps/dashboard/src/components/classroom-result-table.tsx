"use client";

import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { studentDisplayName } from "@/utils/utils";
import { cn } from "@school-clerk/ui/cn";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Spinner } from "@school-clerk/ui/spinner";
import { sum } from "@school-clerk/utils";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { _qc, _trpc } from "./static-trpc";
import { Table } from "@school-clerk/ui/composite";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";

type SortColumn = "student" | "grandTotal";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection } | null;

function computeGrandTotal(
  studentId: string,
  subjects: Array<{
    assessments: Array<{
      obtainable: number;
      percentageObtainable: number | null;
      assessmentResults: Array<{
        obtained: number | null;
        studentTermFormId: string | null;
      }>;
    }>;
  }>,
) {
  let grandTotal = 0;
  for (const subject of subjects) {
    for (const assessment of subject.assessments) {
      const result = assessment.assessmentResults.find(
        (r) => r.studentTermFormId === studentId,
      );
      const obtained = result?.obtained ?? null;
      if (obtained !== null) {
        const percentageObtainable = assessment.percentageObtainable;
        const score =
          percentageObtainable &&
          percentageObtainable !== assessment.obtainable
            ? (obtained / assessment.obtainable) * percentageObtainable
            : obtained;
        grandTotal += score;
      }
    }
  }
  return grandTotal;
}

function SortIcon({
  column,
  sort,
}: {
  column: SortColumn;
  sort: SortState;
}) {
  if (sort?.column !== column) {
    return <ArrowUpDown className="size-3 ml-1 inline opacity-50" />;
  }
  return sort.direction === "asc" ? (
    <ArrowUp className="size-3 ml-1 inline" />
  ) : (
    <ArrowDown className="size-3 ml-1 inline" />
  );
}

export function ClassroomResultTable() {
  const ctx = useReportPageContext();
  const reportData = ctx.reportData;
  const { filters, setFilters } = useStudentReportFilterParams();

  const allSubjects = reportData?.subjects ?? [];
  const students = reportData?.studentTermForms ?? [];

  const [sort, setSort] = useState<SortState>(null);

  const toggleSort = useCallback(
    (column: SortColumn) => {
      setSort((prev) => {
        if (prev?.column !== column) return { column, direction: "asc" };
        if (prev.direction === "asc") return { column, direction: "desc" };
        return null;
      });
    },
    [],
  );

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

  const grandTotalsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      map.set(student.id, computeGrandTotal(student.id, visibleSubjects));
    }
    return map;
  }, [students, visibleSubjects]);

  const sortedStudents = useMemo(() => {
    if (!sort) return students;
    const sorted = [...students].sort((a, b) => {
      if (sort.column === "student") {
        const nameA = studentDisplayName(a.student).toLowerCase();
        const nameB = studentDisplayName(b.student).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return (grandTotalsMap.get(a.id) ?? 0) - (grandTotalsMap.get(b.id) ?? 0);
    });
    if (sort.direction === "desc") sorted.reverse();
    return sorted;
  }, [students, grandTotalsMap, sort]);

  // Checkbox helpers — selections store the original (unsorted) index.
  // The map is computed once when students first load for a given departmentId
  // so that refetches (e.g. after score edits) or sort changes never shift indices.
  const stableIndexMapRef = useRef<Map<string, number>>(new Map());
  const lastDepartmentId = useRef<string | null>(null);
  const currentDeptId = filters.departmentId ?? null;
  if (students.length > 0 && currentDeptId !== lastDepartmentId.current) {
    lastDepartmentId.current = currentDeptId;
    const map = new Map<string, number>();
    students.forEach((s, i) => map.set(s.id, i));
    stableIndexMapRef.current = map;
  }
  const originalIndexMap = stableIndexMapRef.current;

  const selections = filters.selections ?? [];
  const allSelected = students.length > 0 && students.every((s) => selections.includes(originalIndexMap.get(s.id)!));
  const someSelected = !allSelected && selections.length > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setFilters({ selections: [] });
    } else {
      setFilters({ selections: students.map((_, i) => i) });
    }
  }, [allSelected, students, setFilters]);

  const toggleStudent = useCallback(
    (originalIndex: number) => {
      const next = [...selections, originalIndex];
      setFilters({
        selections: next.filter((a) => next.filter((b) => b === a).length === 1),
      });
    },
    [selections, setFilters],
  );

  if (!visibleSubjects.length || !students.length) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No result data available. Select a classroom with assessment records.
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[calc(100vh-180px)]">
      <Table>
        <TableHeader className="sticky top-0 z-20">
          <TableRow>
            <TableHead
              rowSpan={2}
              className="sticky left-0 z-30 bg-background border-r min-w-[40px] text-center"
            >
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Select all students"
              />
            </TableHead>
            <TableHead
              rowSpan={2}
              className="sticky left-[40px] z-30 bg-background border-r min-w-[40px] text-center"
            >
              #
            </TableHead>
            <TableHead
              rowSpan={2}
              className="sticky left-[80px] z-30 bg-background border-r min-w-[160px] cursor-pointer select-none"
              dir="rtl"
              onClick={() => toggleSort("student")}
            >
              <span className="inline-flex items-center">
                Student
                <SortIcon column="student" sort={sort} />
              </span>
            </TableHead>
            {visibleSubjects.map((subject) => (
              <TableHead
                key={subject.id}
                colSpan={subject.assessments.length + 1}
                className="text-center border-l font-semibold bg-background"
                dir="rtl"
              >
                {subject.subject.title}
              </TableHead>
            ))}
            <TableHead
              rowSpan={2}
              className="text-center border-l font-semibold min-w-[60px] cursor-pointer select-none bg-background"
              onClick={() => toggleSort("grandTotal")}
            >
              <span className="inline-flex items-center justify-center">
                Total
                <SortIcon column="grandTotal" sort={sort} />
              </span>
            </TableHead>
            <TableHead
              rowSpan={2}
              className="text-center border-l font-semibold min-w-[50px] bg-background"
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
                    className="text-center border-l text-xs min-w-[70px] bg-background"
                  >
                    <div>{assessment.title}</div>
                    <div className="text-muted-foreground">
                      ({assessment.obtainable})
                    </div>
                  </TableHead>
                ))}
                <Table.Head className="text-center border-l text-xs font-semibold min-w-[60px] bg-background">
                  Total
                </Table.Head>
              </Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.map((student, si) => {
            const originalIndex = originalIndexMap.get(student.id) ?? si;
            return (
              <StudentResultRow
                key={student.id}
                student={student}
                subjects={visibleSubjects}
                index={si}
                originalIndex={originalIndex}
                isSelected={selections.includes(originalIndex)}
                onToggle={toggleStudent}
              />
            );
          })}
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
  originalIndex: number;
  isSelected: boolean;
  onToggle: (originalIndex: number) => void;
}

function StudentResultRow({ student, subjects, index, originalIndex, isSelected, onToggle }: StudentResultRowProps) {
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
    <TableRow data-selected={isSelected || undefined} className={cn(isSelected && "bg-accent/40")}>
      <TableCell className="sticky left-0 z-10 bg-background border-r text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(originalIndex)}
          aria-label="Select student"
        />
      </TableCell>
      <TableCell className="sticky left-[40px] z-10 bg-background border-r text-center text-muted-foreground text-sm">
        {index + 1}
      </TableCell>
      <TableCell
        className="sticky left-[80px] z-10 bg-background border-r whitespace-nowrap"
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
