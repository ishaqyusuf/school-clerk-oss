"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@school-clerk/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, UserPlus, AlertTriangle } from "lucide-react";

export function StudentStatsCards() {
  const trpc = useTRPC();
  const { data: analytics, isLoading } = useQuery(
    trpc.students.analytics.queryOptions({})
  );

  const formatStat = (value?: number) =>
    isLoading ? "--" : (value ?? 0).toLocaleString();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-card p-5 rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Students
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.totalStudents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            All enrolled students
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card p-5 rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active this Term
            </span>
            <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.activeThisTerm)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Registered this term
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card p-5 rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              New Admissions
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.newAdmissions)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This academic period
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card p-5 rounded-xl shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Fees
            </span>
            <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatStat(analytics?.pendingFees)}
          </p>
          <p className="text-xs text-red-500 font-medium mt-1">
            Outstanding balances
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
