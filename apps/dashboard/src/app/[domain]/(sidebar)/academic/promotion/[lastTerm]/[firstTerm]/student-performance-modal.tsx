"use client";

import { useQuery } from "@tanstack/react-query";
import { X, TrendingUp } from "lucide-react";
import { Button } from "@school-clerk/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { useTRPC } from "@/trpc/client";

interface Props {
  studentId: string;
  studentName: string;
  termId: string;
  onClose: () => void;
}

function getGrade(percentage: number | null): string {
  if (percentage === null) return "—";
  if (percentage >= 80) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function StudentPerformanceModal({
  studentId,
  studentName,
  termId,
  onClose,
}: Props) {
  const trpc = useTRPC();

  const { data: termForm, isPending } = useQuery(
    trpc.academics.getStudentTermPerformance.queryOptions({
      studentId,
      termId,
    }),
  );

  // Group assessment records by subject
  const subjectMap = new Map<
    string,
    {
      subjectName: string;
      assessments: {
        title: string;
        obtainable: number | null;
        obtained: number | null;
        percentageScore: number | null;
      }[];
    }
  >();

  if (termForm?.assessmentRecords) {
    for (const record of termForm.assessmentRecords) {
      const subjectName =
        record.classSubjectAssessment?.departmentSubject?.subject?.name ??
        "Unknown";
      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, { subjectName, assessments: [] });
      }
      subjectMap.get(subjectName)!.assessments.push({
        title: record.classSubjectAssessment?.title ?? "—",
        obtainable: record.classSubjectAssessment?.obtainable ?? null,
        obtained: record.obtained ?? null,
        percentageScore: record.percentageScore ?? null,
      });
    }
  }

  // Roll up to subject-level totals
  const subjectRows = Array.from(subjectMap.values()).map((s) => {
    const totalObtained = s.assessments.reduce(
      (acc, a) => acc + (a.obtained ?? 0),
      0,
    );
    const totalObtainable = s.assessments.reduce(
      (acc, a) => acc + (a.obtainable ?? 0),
      0,
    );
    const percentage =
      totalObtainable > 0
        ? Math.round((totalObtained / totalObtainable) * 100)
        : null;
    return {
      subjectName: s.subjectName,
      assessments: s.assessments,
      totalObtained,
      totalObtainable,
      percentage,
      grade: getGrade(percentage),
    };
  });

  const overallAvg =
    subjectRows.length > 0
      ? Math.round(
          subjectRows
            .filter((s) => s.percentage !== null)
            .reduce((acc, s) => acc + (s.percentage ?? 0), 0) /
            subjectRows.filter((s) => s.percentage !== null).length,
        )
      : null;

  const sessionLabel = termForm?.sessionTerm?.session?.title ?? "";
  const termLabel = termForm?.sessionTerm?.title ?? "";
  const className = termForm?.classroomDepartment?.departmentName ?? "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            {studentName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {[className, termLabel, sessionLabel].filter(Boolean).join(" — ")}
          </p>
        </DialogHeader>

        {isPending ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading performance data…
          </div>
        ) : subjectRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No assessment records found for this student.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectRows.map((row) => (
                    <TableRow key={row.subjectName}>
                      <TableCell className="font-medium">
                        {row.subjectName}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalObtained}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalObtainable}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.percentage !== null ? `${row.percentage}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            row.grade === "A"
                              ? "text-emerald-600"
                              : row.grade === "B"
                                ? "text-blue-600"
                                : row.grade === "C"
                                  ? "text-amber-600"
                                  : "text-destructive"
                          }`}
                        >
                          {row.grade}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Overall Average */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Overall Average</span>
              </div>
              <span className="text-2xl font-black text-primary">
                {overallAvg !== null ? `${overallAvg}%` : "—"}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
