"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  PanelRightOpen,
  Printer,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card } from "@school-clerk/ui/card";
import { Item } from "@school-clerk/ui/composite";
import { Input } from "@school-clerk/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { toast } from "@school-clerk/ui/use-toast";

import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { StudentPerformanceModal } from "../../../promotion/[lastTerm]/[firstTerm]/student-performance-modal";

interface Props {
  lastTermId: string;
  firstTermId: string;
}

type SortKey = "name" | "score" | "position" | "status";
type SortDir = "asc" | "desc";
type StudentStatus = "promoted" | "repeated" | "undecided";
type StatusFilter = "all" | StudentStatus;
type ProgressMode = "promote" | "repeat";

type ClassroomOption = {
  id: string;
  classRoomId: string;
  classRoomName: string;
  name: string;
  departmentName: string;
  classLevel: number | null;
  departmentLevel: number | null;
};

type StudentRow = {
  termFormId: string;
  studentId: string;
  name: string;
  className: string | null;
  classRoomId: string | null;
  classRoomName: string | null;
  classroomDepartmentId: string;
  classLevel: number | null;
  departmentLevel: number | null;
  avgScore: number | null;
  isPromoted: boolean;
  progressionStatus: StudentStatus;
  firstTermFormId: string | null;
  targetClassroomDepartmentId: string | null;
  targetClassName: string | null;
  targetClassLevel: number | null;
  targetDepartmentLevel: number | null;
};

function getGrade(pct: number | null): string {
  if (pct === null) return "—";
  if (pct >= 80) return "A";
  if (pct >= 65) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function calculateScores(
  reportSheet: any | null | undefined,
): Map<
  string,
  { percentage: number; obtained: number; obtainable: number; position: number }
> {
  if (!reportSheet) return new Map();

  const studentScores = reportSheet.studentTermForms.map((tf: any) => {
    let totalObtained = 0;
    let totalObtainable = 0;

    for (const subject of reportSheet.subjects) {
      for (const assessment of subject.assessments) {
        const record = assessment.assessmentResults.find(
          (result: any) => result.studentTermFormId === tf.id,
        );

        if (!record?.obtained && !record?.percentageScore) continue;

        const percentageObtainable = assessment.percentageObtainable ?? 0;
        const rawObtained = record.obtained ?? 0;

        const obtained =
          percentageObtainable === assessment.obtainable
            ? rawObtained
            : percentageObtainable && assessment.obtainable
              ? (rawObtained / assessment.obtainable) * percentageObtainable
              : 0;

        totalObtained += obtained;
        totalObtainable += percentageObtainable;
      }
    }

    const percentage =
      totalObtainable > 0
        ? Math.round((totalObtained / totalObtainable) * 1000) / 10
        : 0;

    return {
      studentId: tf.student?.id as string,
      percentage,
      obtained: totalObtained,
      obtainable: totalObtainable,
    };
  });

  const result = new Map<
    string,
    {
      percentage: number;
      obtained: number;
      obtainable: number;
      position: number;
    }
  >();

  studentScores.forEach((student) => {
    const position =
      studentScores.filter((item) => item.obtained > student.obtained).length +
      1;
    result.set(student.studentId, {
      percentage: student.percentage,
      obtained: student.obtained,
      obtainable: student.obtainable,
      position,
    });
  });

  return result;
}

function getRepeatTarget(
  source: ClassroomOption | null | undefined,
  classrooms: ClassroomOption[],
) {
  if (!source) return null;

  return (
    classrooms.find(
      (classroom) =>
        classroom.classLevel === source.classLevel &&
        classroom.departmentLevel === source.departmentLevel,
    ) ??
    classrooms.find(
      (classroom) =>
        classroom.classLevel === source.classLevel &&
        classroom.departmentName === source.departmentName,
    ) ??
    classrooms.find((classroom) => classroom.classLevel === source.classLevel) ??
    null
  );
}

function inferProgressionMode(
  source: ClassroomOption | null | undefined,
  classrooms: ClassroomOption[],
) {
  if (!source) return "classroom" as const;

  const siblings = classrooms.filter(
    (classroom) => classroom.classRoomId === source.classRoomId,
  );
  const levels = new Set(
    siblings
      .map((classroom) => classroom.departmentLevel)
      .filter((level) => level !== null && level !== undefined),
  );

  return levels.size > 1 ? ("department" as const) : ("classroom" as const);
}

function getAutomaticPromoteTarget(
  source: ClassroomOption | null | undefined,
  sourceClassrooms: ClassroomOption[],
  targetClassrooms: ClassroomOption[],
) {
  if (!source) return null;

  const progressionMode = inferProgressionMode(source, sourceClassrooms);
  if (progressionMode === "department") {
    const exactNextLevel =
      source.departmentLevel !== null
        ? source.departmentLevel + 1
        : null;

    return (
      targetClassrooms.find(
        (classroom) =>
          classroom.classLevel === source.classLevel &&
          classroom.departmentLevel === exactNextLevel,
      ) ??
      targetClassrooms.find(
        (classroom) =>
          classroom.classLevel === source.classLevel &&
          source.departmentLevel !== null &&
          classroom.departmentLevel !== null &&
          classroom.departmentLevel > source.departmentLevel,
      ) ??
      null
    );
  }

  return getPromoteTarget(source, targetClassrooms);
}

function getPromoteTarget(
  source: ClassroomOption | null | undefined,
  classrooms: ClassroomOption[],
) {
  if (!source) return null;

  const nextClassLevel =
    source.classLevel !== null ? source.classLevel + 1 : null;

  return (
    classrooms.find(
      (classroom) =>
        classroom.classLevel === nextClassLevel &&
        classroom.departmentLevel === source.departmentLevel,
    ) ??
    classrooms.find(
      (classroom) =>
        classroom.classLevel === nextClassLevel &&
        classroom.departmentName === source.departmentName,
    ) ??
    classrooms.find((classroom) => classroom.classLevel === nextClassLevel) ??
    classrooms.find(
      (classroom) =>
        source.classLevel !== null &&
        classroom.classLevel !== null &&
        classroom.classLevel > source.classLevel,
    ) ??
    null
  );
}

function ProgressStatusBadge({ status }: { status: StudentStatus }) {
  if (status === "promoted") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Promoted
      </Badge>
    );
  }

  if (status === "repeated") {
    return <Badge variant="outline">Repeated</Badge>;
  }

  return <Badge variant="warning">Undecided</Badge>;
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  bg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className={`rounded-full p-2 ${bg}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function ProgressionClient({ lastTermId, firstTermId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams: setClassroomParams } = useClassroomParams();
  const { setParams: setStudentParams } = useStudentParams();

  const [sourceClassroomId, setSourceClassroomId] = useState<string | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "position",
    dir: "asc",
  });
  const [viewStudent, setViewStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const toggleSort = (key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const { data: classroomData } = useQuery(
    trpc.academics.getPromotionClassrooms.queryOptions({
      lastTermId,
      firstTermId,
    }),
  );
  const { data: progressionData } = useQuery(
    trpc.academics.getPromotionStudents.queryOptions({
      lastTermId,
      firstTermId,
      classroomDepartmentId: sourceClassroomId,
    }, {
      enabled: !!sourceClassroomId,
    }),
  );
  const { data: targetClassroomsData } = useQuery(
    trpc.classrooms.all.queryOptions({ sessionTermId: firstTermId }),
  );
  const { data: reportSheet } = useQuery(
    trpc.assessments.getClassroomReportSheet.queryOptions(
      { departmentId: sourceClassroomId ?? "", sessionTermId: lastTermId },
      { enabled: !!sourceClassroomId },
    ),
  );

  const allStudents = (progressionData?.students ?? []) as StudentRow[];
  const meta = classroomData?.meta ?? progressionData?.meta;

  const sourceClassrooms = useMemo<ClassroomOption[]>(
    () => classroomData?.classrooms ?? [],
    [classroomData],
  );

  const targetClassrooms = useMemo<ClassroomOption[]>(() => {
    const raw = targetClassroomsData?.data ?? [];
    return raw
      .map((classroom) => ({
        id: classroom.id,
        classRoomId: classroom.classRoom?.id ?? classroom.id,
        classRoomName: classroom.classRoom?.name ?? classroom.departmentName ?? classroom.id,
        name:
          classroom.displayName ?? classroom.departmentName ?? classroom.id,
        departmentName: classroom.departmentName ?? "",
        classLevel: (classroom.classRoom as any)?.classLevel ?? null,
        departmentLevel: classroom.departmentLevel ?? null,
      }))
      .sort((a, b) => {
        const classLevelOrder = (a.classLevel ?? 9999) - (b.classLevel ?? 9999);
        if (classLevelOrder !== 0) return classLevelOrder;
        return (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999);
      });
  }, [targetClassroomsData]);

  useEffect(() => {
    if (!sourceClassroomId && sourceClassrooms.length > 0) {
      setSourceClassroomId(sourceClassrooms[0]?.id ?? null);
    }
  }, [sourceClassroomId, sourceClassrooms]);

  useEffect(() => {
    if (!sourceClassroomId) return;

    setSelected(new Set());
  }, [sourceClassroomId, sourceClassrooms, targetClassrooms]);

  const calculatedScores = useMemo(
    () => calculateScores(reportSheet),
    [reportSheet],
  );

  const students = useMemo(() => {
    if (!sourceClassroomId) return [];

    return allStudents.map((student) => ({
        ...student,
        status: student.progressionStatus,
        score: calculatedScores.get(student.studentId) ?? null,
      }));
  }, [allStudents, calculatedScores, sourceClassroomId]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const student of students) {
      const key = student.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    const list = students.filter((student) => {
      if (statusFilter !== "all" && student.status !== statusFilter) {
        return false;
      }

      if (
        search &&
        !student.name.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    const direction = sort.dir === "asc" ? 1 : -1;

    return [...list].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return direction * a.name.localeCompare(b.name);
        case "score":
          return direction * ((a.score?.percentage ?? -1) - (b.score?.percentage ?? -1));
        case "position":
          return direction * ((a.score?.position ?? Infinity) - (b.score?.position ?? Infinity));
        case "status":
          return direction * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [search, sort, statusFilter, students]);

  const total = students.length;
  const promotedCount = students.filter((student) => student.status === "promoted").length;
  const repeatedCount = students.filter((student) => student.status === "repeated").length;
  const undecidedCount = students.filter((student) => student.status === "undecided").length;
  const selectedCount = selected.size;
  const undecidedStudentIds = students
    .filter((student) => student.status === "undecided")
    .map((student) => student.studentId);

  const averageScores = students
    .map((student) => student.score?.percentage)
    .filter((score): score is number => score !== null && score !== undefined);
  const overallAverage =
    averageScores.length > 0
      ? Math.round(
          (averageScores.reduce((sum, score) => sum + score, 0) /
            averageScores.length) *
            10,
        ) / 10
      : null;

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selected.has(student.studentId));

  const sourceClassroom =
    sourceClassrooms.find((classroom) => classroom.id === sourceClassroomId) ??
    null;
  const progressionMode = inferProgressionMode(sourceClassroom, sourceClassrooms);
  const automaticPromoteTarget = getAutomaticPromoteTarget(
    sourceClassroom,
    sourceClassrooms,
    targetClassrooms,
  );
  const automaticRepeatTarget = getRepeatTarget(
    sourceClassroom,
    targetClassrooms,
  );
  const hasHigherClassLevel = targetClassrooms.some(
    (classroom) =>
      sourceClassroom?.classLevel != null &&
      classroom.classLevel !== null &&
      classroom.classLevel > sourceClassroom.classLevel,
  );

  const invalidateStudents = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.academics.getPromotionStudents.queryKey({
        lastTermId,
        firstTermId,
        classroomDepartmentId: sourceClassroomId,
      }),
    });

  const progressMutation = useMutation(
    trpc.academics.batchPromote.mutationOptions({
      onSuccess(_, variables) {
        const actionLabel =
          variables.mode === "repeat" ? "Repeated" : "Promoted";
        toast({
          title: `${actionLabel}!`,
          description: "Student progression updated successfully.",
        });
        setSelected(new Set());
        invalidateStudents();
      },
      onError(_, variables) {
        toast({
          title: "Error",
          description:
            variables.mode === "repeat"
              ? "Unable to repeat students right now."
              : "Unable to promote students right now.",
        });
      },
    }),
  );

  const demoteMutation = useMutation(
    trpc.academics.reversePromotion.mutationOptions({
      onSuccess() {
        toast({
          title: "Demoted",
          description: "Selected students were returned to undecided.",
        });
        setSelected(new Set());
        invalidateStudents();
      },
      onError() {
        toast({
          title: "Error",
          description: "Unable to demote the selected students.",
        });
      },
    }),
  );

  const deleteTermFormMutation = useMutation(
    trpc.students.deleteTermSheet.mutationOptions({
      onSuccess() {
        toast({
          title: "Removed",
          description: "The term record was removed successfully.",
        });
        invalidateStudents();
      },
      onError() {
        toast({
          title: "Error",
          description: "Unable to remove the term record.",
          variant: "destructive",
        });
      },
    }),
  );
  const doProgress = (
    mode: ProgressMode,
    studentIds: string[],
  ) => {
    const classroomId =
      mode === "repeat" ? automaticRepeatTarget?.id ?? null : automaticPromoteTarget?.id ?? null;
    if (!classroomId) {
      toast({
        title: "No target class found",
        description:
          mode === "repeat"
            ? "Set up the matching class/stream structure for the new term before repeating students."
            : "Set up the next class/stream structure for the new term before promoting students.",
        variant: "destructive",
      });
      return;
    }

    const eligibleIds = studentIds.filter((studentId) => {
      const student = students.find((item) => item.studentId === studentId);
      if (!student) return false;
      if (mode === "promote") return student.status !== "promoted";
      return student.status !== "repeated";
    });

    if (!eligibleIds.length) return;

    progressMutation.mutate({
      studentIds: eligibleIds,
      fromTermId: lastTermId,
      toTermId: firstTermId,
      mode,
      toClassroomDepartmentId: classroomId ?? undefined,
    });
  };

  const createNextClass = () => {
    setClassroomParams({ createClassroom: true });
  };

  const doDemote = (studentIds: string[]) => {
    const decidedIds = studentIds.filter((studentId) => {
      const student = students.find((item) => item.studentId === studentId);
      return student && student.status !== "undecided";
    });

    if (!decidedIds.length) return;

    demoteMutation.mutate({
      studentIds: decidedIds,
      termId: firstTermId,
    });
  };

  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) {
      filteredStudents.forEach((student) => next.delete(student.studentId));
    } else {
      filteredStudents.forEach((student) => next.add(student.studentId));
    }
    setSelected(next);
  };

  const toggleOne = (studentId: string) => {
    const next = new Set(selected);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelected(next);
  };

  const removeTermRecord = (student: { termFormId: string; name: string }) => {
    if (
      !window.confirm(
        `Remove ${student.name} from the previous-term class list? This deletes the term record.`,
      )
    ) {
      return;
    }

    deleteTermFormMutation.mutate({ id: student.termFormId });
  };

  return (
    <div className="space-y-6">
      {meta ? (
        <div className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Student progression</span>
          <Badge variant="outline">
            {[meta.fromTerm, meta.fromSession].filter(Boolean).join(" · ")}
          </Badge>
          <ArrowRight className="h-3.5 w-3.5" />
          <Badge variant="outline">
            {[meta.toTerm, meta.toSession].filter(Boolean).join(" · ")}
          </Badge>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Previous Term Class
          </p>
          <Select
            value={sourceClassroomId ?? ""}
            onValueChange={(value) => setSourceClassroomId(value || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a class…" />
            </SelectTrigger>
            <SelectContent>
              {sourceClassrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            The first available class is selected automatically.
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Progression Rule
          </p>
          <Badge variant="secondary" className="w-fit">
            {progressionMode === "department"
              ? "Within Sub-classes"
              : "Between Classes"}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {progressionMode === "department"
              ? "Students move to the next stream level inside the same class level."
              : "Students move to the next class level and keep the same stream where possible."}
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Automatic Target
          </p>
          <p className="text-sm font-medium text-foreground">
            Promote to {automaticPromoteTarget?.name ?? "Not configured"}
          </p>
          <p className="text-sm font-medium text-foreground">
            Repeat in {automaticRepeatTarget?.name ?? "Not configured"}
          </p>
          {!automaticPromoteTarget && !hasHigherClassLevel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={createNextClass}
            >
              Create Next Class
            </Button>
          ) : null}
        </Card>
      </div>

      {!sourceClassroomId ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium text-foreground">No previous-term class found</p>
          <p className="mt-1 text-sm">
            Student progression will appear here once previous-term class data is available.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Total Students"
              value={String(total)}
              icon={<Users className="h-5 w-5 text-primary" />}
              bg="bg-primary/5"
            />
            <StatCard
              label="Promoted"
              value={String(promotedCount)}
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              bg="bg-emerald-50 dark:bg-emerald-900/10"
            />
            <StatCard
              label="Repeated"
              value={String(repeatedCount)}
              icon={<ArrowRight className="h-5 w-5 text-blue-600" />}
              bg="bg-blue-50 dark:bg-blue-900/10"
            />
            <StatCard
              label="Undecided"
              value={String(undecidedCount)}
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              bg="bg-amber-50 dark:bg-amber-900/10"
            />
            <StatCard
              label="Class Average"
              value={overallAverage !== null ? `${overallAverage}%` : "—"}
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              bg="bg-blue-50 dark:bg-blue-900/10"
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-56 pl-9"
                  placeholder="Search student…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="promoted">Promoted</SelectItem>
                  <SelectItem value="repeated">Repeated</SelectItem>
                  <SelectItem value="undecided">Undecided</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={!sourceClassroomId}
                onClick={() => {
                  const params = new URLSearchParams({
                    departmentId: sourceClassroomId,
                    termId: lastTermId,
                    tab: "classroom-results",
                    permission: "all",
                  });
                  window.open(`/student-report?${params}`, "_blank");
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                Print Results
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  selectedCount === 0 ||
                  progressMutation.isPending ||
                  !automaticPromoteTarget
                }
                onClick={() => doProgress("promote", Array.from(selected))}
              >
                Promote Selected ({selectedCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  selectedCount === 0 ||
                  progressMutation.isPending ||
                  !automaticRepeatTarget
                }
                onClick={() => doProgress("repeat", Array.from(selected))}
              >
                Repeat Selected ({selectedCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedCount === 0 || demoteMutation.isPending}
                onClick={() => doDemote(Array.from(selected))}
              >
                Demote Selected
              </Button>
              <Button
                size="sm"
                disabled={
                  undecidedCount === 0 ||
                  progressMutation.isPending ||
                  !automaticPromoteTarget
                }
                onClick={() => doProgress("promote", undecidedStudentIds)}
              >
                Promote Remaining
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  undecidedCount === 0 ||
                  progressMutation.isPending ||
                  !automaticRepeatTarget
                }
                onClick={() => doProgress("repeat", undecidedStudentIds)}
              >
                Repeat Remaining
              </Button>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </TableHead>
                  <SortableHead
                    label="Student"
                    active={sort}
                    column="name"
                    onSort={toggleSort}
                  />
                  <SortableHead
                    label="Score"
                    active={sort}
                    column="score"
                    onSort={toggleSort}
                    className="text-right"
                  />
                  <TableHead className="text-right">Grade</TableHead>
                  <SortableHead
                    label="Position"
                    active={sort}
                    column="position"
                    onSort={toggleSort}
                    className="text-right"
                  />
                  <SortableHead
                    label="Status"
                    active={sort}
                    column="status"
                    onSort={toggleSort}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : null}

                {filteredStudents.map((student) => {
                  const percentage = student.score?.percentage ?? null;
                  const grade = getGrade(percentage);
                  const isDuplicate = duplicateNames.has(
                    student.name.trim().toLowerCase(),
                  );

                  return (
                    <TableRow key={student.termFormId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(student.studentId)}
                          onChange={() => toggleOne(student.studentId)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {student.name}
                          {isDuplicate ? (
                            <Badge variant="warning" className="text-[10px]">
                              duplicate
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {percentage !== null ? `${percentage}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{grade}</TableCell>
                      <TableCell className="text-right">
                        {student.score?.position ? `#${student.score.position}` : "—"}
                      </TableCell>
                      <TableCell>
                        <ProgressStatusBadge status={student.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              setViewStudent({
                                id: student.studentId,
                                name: student.name,
                              })
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() =>
                              setStudentParams({
                                studentViewId: student.studentId,
                                studentViewTab: "academics",
                                studentViewTermId: lastTermId,
                                studentTermSheetId: student.termFormId,
                              })
                            }
                          >
                            <PanelRightOpen className="h-4 w-4" />
                          </Button>
                          {student.status === "undecided" ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!automaticPromoteTarget || progressMutation.isPending}
                                onClick={() => doProgress("promote", [student.studentId])}
                              >
                                Promote
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!automaticRepeatTarget || progressMutation.isPending}
                                onClick={() => doProgress("repeat", [student.studentId])}
                              >
                                Repeat
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => doDemote([student.studentId])}
                            >
                              Demote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeTermRecord({
                                termFormId: student.termFormId,
                                name: student.name,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredStudents.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No students found.
              </Card>
            ) : null}

            {filteredStudents.map((student) => {
              const percentage = student.score?.percentage ?? null;
              const grade = getGrade(percentage);
              const isDuplicate = duplicateNames.has(
                student.name.trim().toLowerCase(),
              );

              return (
                <Item
                  key={student.termFormId}
                  variant="outline"
                  className="items-start gap-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(student.studentId)}
                    onChange={() => toggleOne(student.studentId)}
                    className="mt-1 rounded border-border"
                  />
                  <Item.Content>
                    <Item.Header className="items-start">
                      <div className="space-y-1">
                        <Item.Title>{student.name}</Item.Title>
                        <Item.Description>
                          {student.score?.position
                            ? `Position #${student.score.position}`
                            : "Position unavailable"}
                        </Item.Description>
                      </div>
                      <ProgressStatusBadge status={student.status} />
                    </Item.Header>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        Score {percentage !== null ? `${percentage}%` : "—"}
                      </Badge>
                      <Badge variant="outline">Grade {grade}</Badge>
                      {isDuplicate ? <Badge variant="warning">Duplicate name</Badge> : null}
                    </div>
                    <Item.Actions className="mt-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setViewStudent({
                            id: student.studentId,
                            name: student.name,
                          })
                        }
                      >
                        View Result
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setStudentParams({
                            studentViewId: student.studentId,
                            studentViewTab: "academics",
                            studentViewTermId: lastTermId,
                            studentTermSheetId: student.termFormId,
                          })
                        }
                      >
                        Open Record
                      </Button>
                      {student.status === "undecided" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={!automaticPromoteTarget || progressMutation.isPending}
                            onClick={() => doProgress("promote", [student.studentId])}
                          >
                            Promote
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!automaticRepeatTarget || progressMutation.isPending}
                            onClick={() => doProgress("repeat", [student.studentId])}
                          >
                            Repeat
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => doDemote([student.studentId])}
                        >
                          Demote
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          removeTermRecord({
                            termFormId: student.termFormId,
                            name: student.name,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </Item.Actions>
                  </Item.Content>
                </Item>
              );
            })}
          </div>
        </>
      )}

      {viewStudent ? (
        <StudentPerformanceModal
          studentId={viewStudent.id}
          studentName={viewStudent.name}
          termId={lastTermId}
          onClose={() => setViewStudent(null)}
        />
      ) : null}
    </div>
  );
}

function SortableHead({
  label,
  active,
  column,
  onSort,
  className,
}: {
  label: string;
  active: { key: SortKey; dir: SortDir };
  column: SortKey;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 font-semibold"
      >
        {label}
        {active.key === column ? (
          <span className="text-xs text-muted-foreground">
            {active.dir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </TableHead>
  );
}
