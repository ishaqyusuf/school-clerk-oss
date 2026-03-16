"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  ChevronRight,
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

import { useTRPC } from "@/trpc/client";
import { toast } from "@school-clerk/ui/use-toast";
import { StudentPerformanceModal } from "./student-performance-modal";

interface Props {
  lastTermId: string;
  firstTermId: string;
}

type StatusFilter = "all" | "promoted" | "pending";

export function PromotionClient({ lastTermId, firstTermId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [performanceStudent, setPerformanceStudent] = useState<{
    studentId: string;
    name: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: students = [] } = useQuery(
    trpc.academics.getPromotionStudents.queryOptions({
      lastTermId,
      firstTermId,
    }),
  );

  const promoteMutation = useMutation(
    trpc.academics.batchPromote.mutationOptions({
      onSuccess(data) {
        toast({
          title: "Promoted!",
          description: `${data.promoted} student(s) promoted successfully.`,
        });
        setSelected(new Set());
        queryClient.invalidateQueries({
          queryKey: trpc.academics.getPromotionStudents.queryKey({
            lastTermId,
            firstTermId,
          }),
        });
      },
      onError() {
        toast({
          title: "Error",
          description: "Failed to promote students. Please try again.",
        });
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
        queryClient.invalidateQueries({
          queryKey: trpc.academics.getPromotionStudents.queryKey({
            lastTermId,
            firstTermId,
          }),
        });
      },
      onError() {
        toast({
          title: "Error",
          description: "Failed to reverse promotion.",
        });
      },
    }),
  );

  // Unique class list for filter dropdown
  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return Array.from(set) as string[];
  }, [students]);

  // Filtered students
  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === "promoted" && !s.isPromoted) return false;
      if (statusFilter === "pending" && s.isPromoted) return false;
      if (classFilter !== "all" && s.className !== classFilter) return false;
      if (
        search &&
        !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.studentId.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [students, statusFilter, classFilter, search]);

  // Stats
  const total = students.length;
  const promotedCount = students.filter((s) => s.isPromoted).length;
  const pendingCount = total - promotedCount;
  const avgScores = students
    .map((s) => s.avgScore)
    .filter((s): s is number => s !== null);
  const overallAvg =
    avgScores.length > 0
      ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length)
      : null;

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((s) => selected.has(s.studentId));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selected);
      filtered.forEach((s) => next.delete(s.studentId));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((s) => next.add(s.studentId));
      setSelected(next);
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handlePromoteSelected = () => {
    const ids = Array.from(selected).filter(
      (id) => !students.find((s) => s.studentId === id)?.isPromoted,
    );
    if (!ids.length) return;
    promoteMutation.mutate({ studentIds: ids, fromTermId: lastTermId, toTermId: firstTermId });
  };

  const handlePromoteAll = () => {
    const ids = students
      .filter((s) => !s.isPromoted)
      .map((s) => s.studentId);
    if (!ids.length) return;
    promoteMutation.mutate({ studentIds: ids, fromTermId: lastTermId, toTermId: firstTermId });
  };

  const handleReverse = (studentId: string) => {
    reverseMutation.mutate({ studentId, termId: firstTermId });
  };

  const handlePromoteOne = (studentId: string) => {
    promoteMutation.mutate({
      studentIds: [studentId],
      fromTermId: lastTermId,
      toTermId: firstTermId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
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
          label="Avg Score"
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
              placeholder="Search name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={selected.size === 0 || promoteMutation.isPending}
            onClick={handlePromoteSelected}
          >
            Promote Selected ({selected.size})
          </Button>
          <Button
            size="sm"
            disabled={pendingCount === 0 || promoteMutation.isPending}
            onClick={handlePromoteAll}
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
              <TableHead>Name</TableHead>
              <TableHead>Last Class</TableHead>
              <TableHead>Last Term Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground text-sm"
                >
                  No students found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((student) => (
              <TableRow key={student.studentId} className="hover:bg-muted/30">
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(student.studentId)}
                    onChange={() => toggleOne(student.studentId)}
                    className="rounded border-border"
                  />
                </TableCell>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {student.className ?? "—"}
                </TableCell>
                <TableCell>
                  {student.avgScore !== null ? (
                    <button
                      onClick={() =>
                        setPerformanceStudent({
                          studentId: student.studentId,
                          name: student.name,
                        })
                      }
                      className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {student.avgScore}%
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
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
                <TableCell className="text-right">
                  {student.isPromoted ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={reverseMutation.isPending}
                      onClick={() => handleReverse(student.studentId)}
                    >
                      Reverse
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      disabled={promoteMutation.isPending}
                      onClick={() => handlePromoteOne(student.studentId)}
                    >
                      Promote
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Performance Modal */}
      {performanceStudent && (
        <StudentPerformanceModal
          studentId={performanceStudent.studentId}
          studentName={performanceStudent.name}
          termId={lastTermId}
          onClose={() => setPerformanceStudent(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: ReactNode;
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
