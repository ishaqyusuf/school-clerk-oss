"use client";

import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@school-clerk/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserPlus, RotateCcw } from "lucide-react";

export function StudentStatsCards() {
  const trpc = useTRPC();
  const { filter, setFilters } = useStudentFilterParams();
  const { data: analytics, isLoading } = useQuery(
    trpc.students.analytics.queryOptions({
      sessionTermId: filter.sessionTermId,
    }),
  );

  const formatStat = (value?: number) =>
    isLoading ? "--" : (value ?? 0).toLocaleString();

  return (
    <div data-summary-grid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        className="cursor-pointer bg-card p-5 rounded-xl shadow-sm"
        onClick={() => setFilters({ admissionTypes: null })}
      >
        <CardContent data-summary-body className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span data-summary-label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Students
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p data-summary-value className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.totalStudents)}
          </p>
          <p data-summary-label className="text-xs text-muted-foreground mt-1">
            All enrolled students
          </p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer bg-card p-5 rounded-xl shadow-sm"
        onClick={() => setFilters({ admissionTypes: null })}
      >
        <CardContent data-summary-body className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span data-summary-label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active this Term
            </span>
            <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p data-summary-value className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.activeThisTerm)}
          </p>
          <p data-summary-label className="text-xs text-muted-foreground mt-1">
            Registered this term
          </p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer bg-card p-5 rounded-xl shadow-sm"
        onClick={() => setFilters({ admissionTypes: ["NEW_ADMISSION"] })}
      >
        <CardContent data-summary-body className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span data-summary-label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              New Admissions
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <p data-summary-value className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.newAdmissions)}
          </p>
          <p data-summary-label className="text-xs text-muted-foreground mt-1">
            This selected term
          </p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer bg-card p-5 rounded-xl shadow-sm"
        onClick={() => setFilters({ admissionTypes: ["RETURNING"] })}
      >
        <CardContent data-summary-body className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span data-summary-label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Returning Students
            </span>
            <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <p data-summary-value className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.returningStudents)}
          </p>
          <p data-summary-label className="text-xs text-muted-foreground mt-1">
            This selected term
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
