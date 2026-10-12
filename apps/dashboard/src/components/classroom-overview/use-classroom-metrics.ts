"use client";

import { attendanceDateKey, todayAttendanceDate } from "@/lib/attendance";
import { useStudentRegistrationPolicy } from "@/hooks/use-student-registration-policy";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type Scope = {
  departmentId?: string | null;
  sessionId?: string | null;
  termId?: string | null;
  studentCount: number;
};

/**
 * Live numbers for the classroom section rail. Query inputs mirror the ones the
 * sections use, so the rail and the open section share one TanStack cache entry.
 */
export function useClassroomMetrics({
  departmentId,
  sessionId,
  termId,
  studentCount,
}: Scope) {
  const trpc = useTRPC();
  const enabled = Boolean(departmentId);
  const modules = useClassroomFinanceAccess();

  const duplicates = useQuery(
    trpc.students.duplicateGroups.queryOptions(
      {
        classroomDepartmentId: departmentId || null,
        sessionTermId: termId || null,
        studentId: null,
      },
      { enabled },
    ),
  );
  const attendance = useQuery(
    trpc.attendance.getClassroomAttendance.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled },
    ),
  );
  const subjects = useQuery(
    trpc.subjects.byClassroom.queryOptions(
      { departmentId: departmentId || "-", sessionTermId: termId || "-" },
      { enabled: enabled && Boolean(termId) },
    ),
  );
  const charges = useQuery(
    trpc.finance.getCharges.queryOptions(
      classroomChargesInput({ departmentId, sessionId, termId }),
      { enabled: enabled && modules.financeEnabled, retry: false },
    ),
  );

  return useMemo(() => {
    const sessions = attendance.data ?? [];
    const eligible = sessions.reduce(
      (sum, s) => sum + Math.max(s.total - s.excused - s.leave, 0),
      0,
    );
    const attended = sessions.reduce((sum, s) => sum + s.present + s.late, 0);
    const today = todayAttendanceDate();
    const takenToday = sessions.some(
      (s) => attendanceDateKey(s.attendanceDate) === today,
    );

    const subjectRows = subjects.data?.subjects ?? [];
    const subjectsNeedingWeights = subjectRows.filter((subject) => {
      const weight = subject.assessments.reduce(
        (sum, a) => sum + Number(a.percentage || 0),
        0,
      );
      return Math.round(weight) !== 100;
    }).length;

    const outstanding = ((charges.data ?? []) as Array<{ outstanding?: number }>)
      .reduce((sum, c) => sum + Math.max(Number(c.outstanding || 0), 0), 0);

    return {
      students: {
        // Term-scoped total from the duplicate check; the overview count spans
        // the whole academic session.
        count: duplicates.data?.totalStudents ?? studentCount,
        duplicateGroups: duplicates.data?.duplicateGroupCount ?? 0,
        isLoading: duplicates.isLoading,
      },
      attendance: {
        sessions: sessions.length,
        averageRate:
          eligible > 0 ? Math.round((attended / eligible) * 100) : null,
        takenToday,
        isLoading: attendance.isLoading,
      },
      subjects: {
        count: subjectRows.length,
        needingWeights: subjectsNeedingWeights,
        isLoading: subjects.isLoading,
      },
      payments: {
        outstanding,
        status: !modules.ready
          ? ("loading" as const)
          : !modules.financeEnabled
            ? ("disabled" as const)
            : charges.isError
              ? ("unavailable" as const)
              : charges.isLoading
                ? ("loading" as const)
                : ("ready" as const),
        isLoading: !modules.ready || (modules.financeEnabled && charges.isLoading),
      },
    };
  }, [
    attendance.data,
    attendance.isLoading,
    charges.data,
    charges.isError,
    charges.isLoading,
    modules.financeEnabled,
    modules.ready,
    duplicates.data,
    duplicates.isLoading,
    studentCount,
    subjects.data,
    subjects.isLoading,
  ]);
}

export type ClassroomMetrics = ReturnType<typeof useClassroomMetrics>;

export function classroomChargesInput({
  departmentId,
  sessionId,
  termId,
}: {
  departmentId?: string | null;
  sessionId?: string | null;
  termId?: string | null;
}) {
  return {
    classroomDepartmentId: departmentId || null,
    sessionId: sessionId || null,
    termId: termId || null,
    payerType: "STUDENT" as const,
  };
}

/** Whether this school has Billing & Finance, which every charges query requires. */
export function useClassroomFinanceAccess() {
  const policy = useStudentRegistrationPolicy();
  return {
    // A failed settings read should not hide the section forever; fall back to
    // trying the charges query, which reports its own error.
    ready: policy.ready || policy.isError,
    financeEnabled: policy.ready ? policy.billingEnabled : policy.isError,
  };
}
