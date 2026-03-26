"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  Plus,
  X,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Printer,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
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
import { Card } from "@school-clerk/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@school-clerk/ui/dialog";
import { Separator } from "@school-clerk/ui/separator";
import { ScrollArea } from "@school-clerk/ui/scroll-area";

import { useTRPC } from "@/trpc/client";
import { toast } from "@school-clerk/ui/use-toast";

interface Props {
  lastTermId: string;
  firstTermId: string;
}

type StatusFilter = "all" | "promoted" | "pending";
type SortKey = "name" | "score" | "position" | "status";
type SortDir = "asc" | "desc";

function getGrade(pct: number | null): string {
  if (pct === null) return "—";
  if (pct >= 80) return "A";
  if (pct >= 65) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

/** Replicates the score calculation from use-report-page.ts */
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
          (r: any) => r.studentTermFormId === tf.id,
        );
        if (!record?.obtained && !record?.percentageScore) continue;

        const pObtainable = assessment.percentageObtainable ?? 0;
        const rawObtained = record.obtained ?? 0;

        const obtained =
          pObtainable === assessment.obtainable
            ? rawObtained
            : pObtainable && assessment.obtainable
              ? (rawObtained / assessment.obtainable) * pObtainable
              : 0;

        totalObtained += obtained;
        totalObtainable += pObtainable;
      }
    }

    const percentage =
      totalObtainable > 0
        ? Math.round((totalObtained / totalObtainable) * 1000) / 10
        : 0;

    return {
      studentId: tf.student?.id as string,
      termFormId: tf.id as string,
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
  studentScores.forEach((s: any) => {
    const position =
      studentScores.filter((x: any) => x.obtained > s.obtained).length + 1;
    if (s.studentId) {
      result.set(s.studentId, {
        percentage: s.percentage,
        obtained: s.obtained,
        obtainable: s.obtainable,
        position,
      });
    }
  });
  return result;
}

export function PromotionClient({ lastTermId, firstTermId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { domain } = useParams<{ domain: string }>();

  const [sourceClassroomId, setSourceClassroomId] = useState<string | null>(
    null,
  );
  const [targetClassroomId, setTargetClassroomId] = useState<string | null>(
    null,
  );
  const [viewStudentId, setViewStudentId] = useState<string | null>(null);
  // { termFormId, studentName } for the pending delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    termFormId: string;
    studentName: string;
  } | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [showNewClass, setShowNewClass] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "position",
    dir: "asc",
  });

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  // All students from last term — used to derive the classroom list
  const { data: promotionData } = useQuery(
    trpc.academics.getPromotionStudents.queryOptions({
      lastTermId,
      firstTermId,
    }),
  );
  const allStudents = promotionData?.students ?? [];
  const promotionMeta = promotionData?.meta;

  // Derive source classrooms from student data, sorted by classLevel then departmentLevel
  const sourceClassrooms = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; name: string; classLevel: number | null; departmentLevel: number | null }
    >();
    for (const s of allStudents) {
      if (!seen.has(s.classroomDepartmentId)) {
        seen.set(s.classroomDepartmentId, {
          id: s.classroomDepartmentId,
          name: s.className ?? s.classroomDepartmentId,
          classLevel: s.classLevel ?? null,
          departmentLevel: s.departmentLevel ?? null,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      const cl = (a.classLevel ?? 9999) - (b.classLevel ?? 9999);
      if (cl !== 0) return cl;
      return (a.departmentLevel ?? 9999) - (b.departmentLevel ?? 9999);
    });
  }, [allStudents]);

  // When source classroom changes, auto-select the next classroom in index order
  useEffect(() => {
    if (!sourceClassroomId) return;
    const idx = sourceClassrooms.findIndex((c) => c.id === sourceClassroomId);
    const next = sourceClassrooms[idx + 1] ?? null;
    setTargetClassroomId(next?.id ?? null);
  }, [sourceClassroomId, sourceClassrooms]);

  // Classroom report sheet for score calculation
  const { data: reportSheet } = useQuery(
    trpc.assessments.getClassroomReportSheet.queryOptions(
      { departmentId: sourceClassroomId!, sessionTermId: lastTermId },
      { enabled: !!sourceClassroomId },
    ),
  );

  const calculatedScores = useMemo(
    () => calculateScores(reportSheet),
    [reportSheet],
  );

  // Filter all students to selected classroom, merge in calculated scores
  const students = useMemo(() => {
    const base = sourceClassroomId
      ? allStudents.filter((s) => s.classroomDepartmentId === sourceClassroomId)
      : [];
    return base.map((s) => ({
      ...s,
      score: calculatedScores.get(s.studentId) ?? null,
    }));
  }, [allStudents, sourceClassroomId, calculatedScores]);

  const filtered = useMemo(() => {
    const list = students.filter((s) => {
      if (statusFilter === "promoted" && !s.isPromoted) return false;
      if (statusFilter === "pending" && s.isPromoted) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "score": {
          const as = a.score?.percentage ?? -1;
          const bs = b.score?.percentage ?? -1;
          return dir * (as - bs);
        }
        case "position": {
          const ap = a.score?.position ?? Infinity;
          const bp = b.score?.position ?? Infinity;
          return dir * (ap - bp);
        }
        case "status":
          return dir * (Number(a.isPromoted) - Number(b.isPromoted));
        default:
          return 0;
      }
    });
  }, [students, statusFilter, search, sort]);

  // Detect duplicate names across ALL students in the selected classroom
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of students) {
      const key = s.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(
      Array.from(counts.entries())
        .filter(([, n]) => n > 1)
        .map(([name]) => name),
    );
  }, [students]);

  const total = students.length;
  const promotedCount = students.filter((s) => s.isPromoted).length;
  const pendingCount = total - promotedCount;
  const scores = students
    .map((s) => s.score?.percentage)
    .filter((s): s is number => s !== undefined && s !== null);
  const overallAvg =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
        10
      : null;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.studentId));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allFilteredSelected) {
      filtered.forEach((s) => next.delete(s.studentId));
    } else {
      filtered.forEach((s) => next.add(s.studentId));
    }
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const invalidateStudents = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.academics.getPromotionStudents.queryKey({
        lastTermId,
        firstTermId,
      }),
    });

  const promoteMutation = useMutation(
    trpc.academics.batchPromote.mutationOptions({
      onSuccess(data) {
        toast({
          title: "Promoted!",
          description: `${data.promoted} student(s) promoted successfully.`,
        });
        setSelected(new Set());
        invalidateStudents();
      },
      onError() {
        toast({ title: "Error", description: "Failed to promote students." });
      },
    }),
  );

  const reverseMutation = useMutation(
    trpc.academics.reversePromotion.mutationOptions({
      onSuccess() {
        toast({
          title: "Reversed",
          description: "Promotion has been reversed.",
        });
        invalidateStudents();
      },
      onError() {
        toast({ title: "Error", description: "Failed to reverse promotion." });
      },
    }),
  );

  const deleteTermFormMutation = useMutation(
    trpc.students.deleteTermSheet.mutationOptions({
      onSuccess() {
        toast({
          title: "Deleted",
          description: "Student term record has been removed.",
        });
        setDeleteTarget(null);
        invalidateStudents();
      },
      onError() {
        toast({
          title: "Error",
          description: "Failed to delete student term record.",
          variant: "destructive",
        });
      },
    }),
  );

  const createClassroomMutation = useMutation(
    trpc.classrooms.createClassroom.mutationOptions({
      onSuccess(data) {
        const dept = data.classRoomDepartments?.[0];
        if (dept) {
          setTargetClassroomId(dept.id);
          queryClient.invalidateQueries({
            queryKey: trpc.classrooms.all.queryKey({
              sessionTermId: firstTermId,
            }),
          });
        }
        setShowNewClass(false);
        setNewClassName("");
        toast({ title: "Classroom created", description: data.name });
      },
      onError() {
        toast({ title: "Error", description: "Failed to create classroom." });
      },
    }),
  );

  const doPromote = (studentIds: string[]) => {
    const unpromoted = studentIds.filter(
      (id) => !students.find((s) => s.studentId === id)?.isPromoted,
    );
    if (!unpromoted.length) return;
    promoteMutation.mutate({
      studentIds: unpromoted,
      fromTermId: lastTermId,
      toTermId: firstTermId,
      toClassroomDepartmentId: targetClassroomId ?? undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Promotion context */}
      {promotionMeta && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground px-1">
          <span className="font-medium text-foreground">Promoting from</span>
          <Badge variant="outline">
            {[promotionMeta.fromTerm, promotionMeta.fromSession]
              .filter(Boolean)
              .join(" · ")}
          </Badge>
          <ArrowRight className="h-3.5 w-3.5" />
          <Badge variant="outline">
            {[promotionMeta.toTerm, promotionMeta.toSession]
              .filter(Boolean)
              .join(" · ")}
          </Badge>
        </div>
      )}

      {/* Classroom selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source classroom */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Source Classroom (Last Term)
          </p>
          <Select
            value={sourceClassroomId ?? ""}
            onValueChange={(v) => {
              setSourceClassroomId(v || null);
              setSelected(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a classroom…" />
            </SelectTrigger>
            <SelectContent>
              {sourceClassrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Target classroom */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Promote To (New Session)
          </p>
          {showNewClass ? (
            <div className="flex gap-2">
              <Input
                placeholder="New classroom name…"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newClassName.trim()) {
                    createClassroomMutation.mutate({
                      className: newClassName.trim(),
                    });
                  }
                }}
              />
              <Button
                size="sm"
                disabled={
                  !newClassName.trim() || createClassroomMutation.isPending
                }
                onClick={() =>
                  createClassroomMutation.mutate({
                    className: newClassName.trim(),
                  })
                }
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewClass(false);
                  setNewClassName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={targetClassroomId ?? ""}
                onValueChange={(v) => setTargetClassroomId(v || null)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Same as source (default)…" />
                </SelectTrigger>
                <SelectContent>
                  {sourceClassrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 shrink-0"
                onClick={() => setShowNewClass(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                New Class
              </Button>
            </div>
          )}
          {!targetClassroomId && !showNewClass && (
            <p className="text-[11px] text-muted-foreground">
              Leave blank to keep students in their current classroom.
            </p>
          )}
        </Card>
      </div>

      {!sourceClassroomId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Select a source classroom to begin</p>
          <p className="text-sm mt-1">
            Choose a classroom above to view students and their scores.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-primary" />}
              label="Total Students"
              value={String(total)}
              bg="bg-primary/5"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              label="Promoted"
              value={String(promotedCount)}
              bg="bg-emerald-50 dark:bg-emerald-900/10"
            />
            <StatCard
              icon={<Clock className="h-5 w-5 text-amber-500" />}
              label="Pending"
              value={String(pendingCount)}
              bg="bg-amber-50 dark:bg-amber-900/10"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              label="Class Average"
              value={overallAvg !== null ? `${overallAvg}%` : "—"}
              bg="bg-blue-50 dark:bg-blue-900/10"
            />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-56"
                  placeholder="Search name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="promoted">Promoted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!sourceClassroomId}
                onClick={() => {
                  const params = new URLSearchParams({
                    departmentId: sourceClassroomId!,
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
                variant="outline"
                size="sm"
                disabled={selected.size === 0 || promoteMutation.isPending}
                onClick={() => doPromote(Array.from(selected))}
              >
                Promote Selected ({selected.size})
              </Button>
              <Button
                size="sm"
                disabled={pendingCount === 0 || promoteMutation.isPending}
                onClick={() =>
                  doPromote(
                    students
                      .filter((s) => !s.isPromoted)
                      .map((s) => s.studentId),
                  )
                }
              >
                Promote All
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
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
                  <SortHead
                    label="Name"
                    col="name"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortHead
                    label="Score"
                    col="score"
                    sort={sort}
                    onSort={toggleSort}
                    className="text-right justify-end"
                  />
                  <TableHead className="text-right">Grade</TableHead>
                  <SortHead
                    label="Position"
                    col="position"
                    sort={sort}
                    onSort={toggleSort}
                    className="text-right justify-end"
                  />
                  <SortHead
                    label="Status"
                    col="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((student) => {
                  const pct = student.score?.percentage ?? null;
                  const grade = getGrade(pct);
                  const isDuplicate = duplicateNames.has(
                    student.name.trim().toLowerCase(),
                  );
                  return (
                    <TableRow
                      key={student.termFormId}
                      className={`cursor-pointer ${
                        isDuplicate
                          ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-l-2 border-l-amber-400"
                          : "hover:bg-muted/30"
                      }`}
                      onClick={() => setViewStudentId(student.studentId)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                          {isDuplicate && (
                            <Badge
                              variant="warning"
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                            >
                              duplicate
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {pct !== null ? (
                          <span className="text-sm font-semibold">{pct}%</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            grade === "A"
                              ? "text-emerald-600"
                              : grade === "B"
                                ? "text-blue-600"
                                : grade === "C"
                                  ? "text-amber-600"
                                  : grade === "—"
                                    ? "text-muted-foreground"
                                    : "text-destructive"
                          }`}
                        >
                          {grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {student.score?.position != null
                          ? `#${student.score.position}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {student.isPromoted ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Promoted
                          </Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {student.isPromoted ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={reverseMutation.isPending}
                              onClick={() =>
                                reverseMutation.mutate({
                                  studentId: student.studentId,
                                  termId: firstTermId,
                                })
                              }
                            >
                              Reverse
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              disabled={promoteMutation.isPending}
                              onClick={() => doPromote([student.studentId])}
                            >
                              Promote
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive px-2"
                            onClick={() =>
                              setDeleteTarget({
                                termFormId: student.termFormId,
                                studentName: student.name,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Student result modal */}
      <StudentResultModal
        studentId={viewStudentId}
        reportSheet={reportSheet}
        departmentId={sourceClassroomId}
        sessionTermId={lastTermId}
        onClose={() => setViewStudentId(null)}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(termFormId) =>
          deleteTermFormMutation.mutate({ id: termFormId })
        }
        isPending={deleteTermFormMutation.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  target,
  onClose,
  onConfirm,
  isPending,
}: {
  target: { termFormId: string; studentName: string } | null;
  onClose: () => void;
  onConfirm: (termFormId: string) => void;
  isPending: boolean;
}) {
  const trpc = useTRPC();
  const { data: details, isFetching } = useQuery(
    trpc.students.getTermFormDetails.queryOptions(
      { id: target?.termFormId ?? "" },
      { enabled: !!target?.termFormId },
    ),
  );

  const hasData =
    details &&
    (details.counts.assessmentRecords > 0 ||
      details.counts.studentFees > 0 ||
      details.counts.payments > 0 ||
      details.counts.attendance > 0);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Student Term Record
          </DialogTitle>
          <DialogDescription>
            You are about to permanently remove{" "}
            <span className="font-semibold text-foreground">
              {target?.studentName}
            </span>{" "}
            from this term. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading record details…
          </div>
        ) : details ? (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Records attached to this term form
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between rounded bg-background border px-3 py-2">
                  <span className="text-muted-foreground">Assessment scores</span>
                  <Badge variant={details.counts.assessmentRecords > 0 ? "warning" : "secondary"}>
                    {details.counts.assessmentRecords}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded bg-background border px-3 py-2">
                  <span className="text-muted-foreground">Fee records</span>
                  <Badge variant={details.counts.studentFees > 0 ? "warning" : "secondary"}>
                    {details.counts.studentFees}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded bg-background border px-3 py-2">
                  <span className="text-muted-foreground">Payments</span>
                  <Badge variant={details.counts.payments > 0 ? "warning" : "secondary"}>
                    {details.counts.payments}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded bg-background border px-3 py-2">
                  <span className="text-muted-foreground">Attendance</span>
                  <Badge variant={details.counts.attendance > 0 ? "warning" : "secondary"}>
                    {details.counts.attendance}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Detail lists */}
            {hasData && (
              <ScrollArea className="h-52 rounded-md border">
                <div className="p-3 space-y-3 text-sm">
                  {details.assessmentRecords.length > 0 && (
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Assessment Scores
                      </p>
                      {details.assessmentRecords.map((r) => (
                        <div
                          key={r.id}
                          className="flex justify-between py-0.5 border-b last:border-0"
                        >
                          <span className="text-muted-foreground truncate max-w-[60%]">
                            {r.subjectTitle} — {r.assessmentTitle}
                          </span>
                          <span className="font-medium">{r.obtained}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {details.studentFees.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Fee Records
                      </p>
                      {details.studentFees.map((f) => (
                        <div
                          key={f.id}
                          className="flex justify-between py-0.5 border-b last:border-0"
                        >
                          <span className="text-muted-foreground">Fee</span>
                          <span className="font-medium">
                            {f.amount} (pending: {f.pendingAmount})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {details.payments.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Payments
                      </p>
                      {details.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between py-0.5 border-b last:border-0"
                        >
                          <span className="text-muted-foreground text-xs">
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleDateString()
                              : "—"}
                          </span>
                          <span className="font-medium">{p.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {details.attendance.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        Attendance ({details.counts.attendance} records)
                      </p>
                      <p className="text-muted-foreground text-xs">
                        All attendance records for this term will be unlinked.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {hasData && (
              <p className="text-xs text-destructive flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                The records above are attached to this term form. Deleting it
                will soft-delete the form only — linked financial and assessment
                data is preserved in the database.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending || isFetching}
            onClick={() => target && onConfirm(target.termFormId)}
          >
            {isPending ? "Deleting…" : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
const ASSESSMENT_ORDER = ["الحضور", "الاختبار", "الامتحان"];

type EditingCell = { rowIdx: number; colIdx: number; value: string };

function StudentResultModal({
  studentId,
  reportSheet,
  departmentId,
  sessionTermId,
  onClose,
}: {
  studentId: string | null;
  reportSheet: any | null | undefined;
  departmentId: string | null;
  sessionTermId: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const updateMutation = useMutation(
    trpc.assessments.updateAssessmentScore.mutationOptions({
      onSuccess() {
        if (departmentId) {
          queryClient.invalidateQueries({
            queryKey: trpc.assessments.getClassroomReportSheet.queryKey({
              departmentId,
              sessionTermId,
            }),
          });
        }
        setEditingCell(null);
      },
      onError() {
        toast({ title: "Error", description: "Failed to update score." });
      },
    }),
  );

  // Derived student data — includes asmtId, recordId, rawObtained, rawObtainable per cell
  const studentData = useMemo(() => {
    if (!studentId || !reportSheet) return null;

    const tf = reportSheet.studentTermForms.find(
      (f: any) => f.student?.id === studentId,
    );
    if (!tf) return null;

    const studentName = [
      tf.student?.name,
      tf.student?.otherName,
      tf.student?.surname,
    ]
      .filter(Boolean)
      .join(" ");

    // Filter out assessments with no valid score across ALL students in the
    // classroom, then drop subjects with no remaining assessments — mirrors
    // the same logic used in ClassroomResultTable.
    const visibleSubjects: typeof reportSheet.subjects = reportSheet.subjects
      .map((subj: any) => ({
        ...subj,
        assessments: subj.assessments.filter((asmt: any) =>
          asmt.assessmentResults.some((r: any) => r.obtained !== null),
        ),
      }))
      .filter((subj: any) => subj.assessments.length > 0);

    // Collect unique assessment titles (from visible columns only), sorted
    const titleSet = new Set<string>();
    for (const subj of visibleSubjects) {
      for (const asmt of subj.assessments) titleSet.add(asmt.title);
    }
    const sortedTitles = Array.from(titleSet).sort((a, b) => {
      const ai = ASSESSMENT_ORDER.indexOf(a);
      const bi = ASSESSMENT_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    // Max display obtainable per column header
    const colObtainables = sortedTitles.map((title) => {
      let total = 0;
      for (const subj of visibleSubjects) {
        const asmt = subj.assessments.find((a: any) => a.title === title);
        if (asmt) total += asmt.percentageObtainable ?? 0;
      }
      return total;
    });

    // Build rows with full cell metadata for editing (visible subjects only)
    const rows = visibleSubjects.map((subj: any) => {
      const cells = sortedTitles.map((title) => {
        const asmt = subj.assessments.find((a: any) => a.title === title);
        if (!asmt) {
          return {
            obtained: null as number | null,
            obtainable: null as number | null,
            asmtId: null as number | null,
            recordId: null as number | null,
            rawObtained: null as number | null,
            rawObtainable: null as number | null,
          };
        }

        const record = asmt.assessmentResults.find(
          (r: any) => r.studentTermFormId === tf.id,
        );

        const pObtainable: number = asmt.percentageObtainable ?? 0;
        const rawObtainable: number = asmt.obtainable ?? 0;

        if (!record?.obtained && !record?.percentageScore) {
          return {
            obtained: null,
            obtainable: pObtainable,
            asmtId: asmt.id as number,
            recordId: null,
            rawObtained: null,
            rawObtainable,
          };
        }

        const rawObtained: number = record.obtained ?? 0;
        const obtained =
          pObtainable === rawObtainable
            ? rawObtained
            : pObtainable && rawObtainable
              ? (rawObtained / rawObtainable) * pObtainable
              : rawObtained;

        return {
          obtained,
          obtainable: pObtainable,
          asmtId: asmt.id as number,
          recordId: (record?.id ?? null) as number | null,
          rawObtained,
          rawObtainable,
        };
      });

      const totalObtained = cells.reduce((s, c) => s + (c.obtained ?? 0), 0);
      const totalObtainable = cells.reduce(
        (s, c) => s + (c.obtainable ?? 0),
        0,
      );
      const pct =
        totalObtainable > 0
          ? +((totalObtained / totalObtainable) * 100).toFixed(1)
          : null;

      return {
        name: subj.subject?.title ?? "—",
        cells,
        totalObtained,
        totalObtainable,
        pct,
      };
    });

    const grandObtained = rows.reduce(
      (s: number, r: any) => s + r.totalObtained,
      0,
    );
    const grandObtainable = rows.reduce(
      (s: number, r: any) => s + r.totalObtainable,
      0,
    );
    const grandPct =
      grandObtainable > 0
        ? +((grandObtained / grandObtainable) * 100).toFixed(1)
        : null;

    return {
      tf,
      studentName,
      classroomName: reportSheet.departmentName,
      sortedTitles,
      colObtainables,
      rows,
      grandObtained,
      grandObtainable,
      grandPct,
    };
  }, [studentId, reportSheet]);

  const openEdit = (rowIdx: number, colIdx: number, cell: any) => {
    if (!cell.asmtId) return; // no assessment mapped here
    const current = cell.rawObtained !== null ? String(cell.rawObtained) : "";
    setEditingCell({ rowIdx, colIdx, value: current });
    // focus the input next tick
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitEdit = (rowIdx: number, colIdx: number) => {
    if (!editingCell || !studentData) return;
    const cell = studentData.rows[rowIdx]?.cells[colIdx];
    if (!cell?.asmtId) {
      setEditingCell(null);
      return;
    }

    const parsed = parseFloat(editingCell.value);
    const obtained = isNaN(parsed)
      ? null
      : Math.max(0, Math.min(parsed, cell.rawObtainable ?? Infinity));

    updateMutation.mutate({
      id: cell.recordId,
      obtained,
      assessmentId: cell.asmtId,
      studentTermId: studentData.tf.id,
      studentId: studentId!,
      departmentId: departmentId ?? "",
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIdx: number,
    colIdx: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(rowIdx, colIdx);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  return (
    <Dialog open={!!studentId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{studentData?.studentName ?? "Student"}</DialogTitle>
          {studentData && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {studentData.classroomName}
              <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                Click any score cell to edit
              </span>
            </p>
          )}
        </DialogHeader>

        {!studentData && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No result data available for this student.
          </div>
        )}

        {studentData && studentData.rows.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No assessment records found.
          </div>
        )}

        {studentData && studentData.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left px-3 py-2 font-bold text-xs border border-border min-w-32">
                    Subject
                  </th>
                  {studentData.sortedTitles.map((title: string, i: number) => (
                    <th
                      key={title}
                      className="text-center px-3 py-2 font-bold text-xs border border-border whitespace-nowrap"
                    >
                      {title}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        ({studentData.colObtainables[i]})
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 font-bold text-xs border border-border bg-muted">
                    Total
                    <div className="text-[10px] font-normal text-muted-foreground">
                      %
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentData.rows.map((row: any, rowIdx: number) => (
                  <tr key={row.name} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium border border-border">
                      {row.name}
                    </td>
                    {row.cells.map((cell: any, colIdx: number) => {
                      const isEditing =
                        editingCell?.rowIdx === rowIdx &&
                        editingCell?.colIdx === colIdx;
                      const isClickable = !!cell.asmtId;

                      return (
                        <td
                          key={colIdx}
                          className={`text-center px-1 py-1 border border-border tabular-nums transition-colors ${
                            isClickable && !isEditing
                              ? "cursor-pointer hover:bg-primary/8 hover:ring-1 hover:ring-inset hover:ring-primary/40"
                              : ""
                          } ${isEditing ? "bg-primary/5 ring-2 ring-inset ring-primary" : ""}`}
                          onClick={() =>
                            !isEditing &&
                            isClickable &&
                            openEdit(rowIdx, colIdx, cell)
                          }
                          title={
                            isClickable
                              ? `Max: ${cell.rawObtainable}`
                              : undefined
                          }
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              min={0}
                              max={cell.rawObtainable ?? undefined}
                              step="0.5"
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell((prev) =>
                                  prev
                                    ? { ...prev, value: e.target.value }
                                    : null,
                                )
                              }
                              onBlur={() => commitEdit(rowIdx, colIdx)}
                              onKeyDown={(e) =>
                                handleKeyDown(e, rowIdx, colIdx)
                              }
                              disabled={updateMutation.isPending}
                              className="w-16 text-center bg-transparent outline-none font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              autoFocus
                            />
                          ) : cell.obtained !== null ? (
                            <span className="font-semibold px-2">
                              {+cell.obtained.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs px-2">
                              {isClickable ? "—" : ""}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2 border border-border bg-muted/20 font-bold tabular-nums">
                      {row.pct !== null ? `${row.pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold border-t-2 border-border">
                  <td className="px-3 py-2.5 border border-border text-xs uppercase tracking-wide">
                    Grand Total
                  </td>
                  {studentData.sortedTitles.map((_: string, i: number) => (
                    <td key={i} className="border border-border" />
                  ))}
                  <td className="text-center px-3 py-2.5 border border-border">
                    <span className="text-base font-black tabular-nums">
                      {studentData.grandPct !== null
                        ? `${studentData.grandPct}%`
                        : "—"}
                    </span>
                    {studentData.grandObtainable > 0 && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {+studentData.grandObtained.toFixed(1)} /{" "}
                        {+studentData.grandObtainable.toFixed(1)}
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortHead({
  label,
  col,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  col: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === col;
  const Icon = active
    ? sort.dir === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;
  return (
    <TableHead>
      <button
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-foreground transition-colors ${active ? "text-foreground" : "text-muted-foreground"} ${className}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`${bg} rounded-xl p-4 flex items-center gap-3 border border-border`}
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-black tracking-tight">{value}</p>
      </div>
    </div>
  );
}
