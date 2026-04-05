"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@school-clerk/ui/cn";
import { CollectionStudents } from "./collection-students";

export function CollectionsDashboard() {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.finance.getCollectionSummary.queryOptions({}),
  );
  const [selectedClassroom, setSelectedClassroom] = useState<{
    id: string;
    name: string | null;
  } | null>(null);

  if (!summary.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>No classroom data found for the current term.</p>
        </CardContent>
      </Card>
    );
  }

  const totalBilled = summary.reduce((s, r) => s + r.totalBilled, 0);
  const totalPaid = summary.reduce((s, r) => s + r.totalPaid, 0);
  const totalPending = summary.reduce((s, r) => s + r.totalPending, 0);
  const overallRate =
    totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  if (selectedClassroom) {
    return (
      <CollectionStudents
        classroomId={selectedClassroom.id}
        classroomName={selectedClassroom.name}
        onBack={() => setSelectedClassroom(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Total Billed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold">
              <AnimatedNumber value={totalBilled} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold text-green-600">
              <AnimatedNumber value={totalPaid} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold text-orange-600">
              <AnimatedNumber value={totalPending} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{overallRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-classroom table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Collection by Classroom</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {summary.map((row) => (
              <button
                key={row.classroomId}
                type="button"
                className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-muted/40 transition-colors"
                onClick={() =>
                  setSelectedClassroom({
                    id: row.classroomId,
                    name: row.classroomName,
                  })
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {row.classroomName || "Unnamed Class"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />
                    {row.studentCount} students
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-6 text-right">
                  <div>
                    <div className="text-xs text-muted-foreground">Billed</div>
                    <div className="font-mono text-sm">
                      <AnimatedNumber value={row.totalBilled} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Collected</div>
                    <div className="font-mono text-sm text-green-600">
                      <AnimatedNumber value={row.totalPaid} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                    <div className="font-mono text-sm text-orange-600">
                      <AnimatedNumber value={row.totalPending} />
                    </div>
                  </div>
                </div>

                <CollectionRateBadge rate={row.collectionRate} />

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CollectionRateBadge({ rate }: { rate: number }) {
  const variant =
    rate >= 80 ? "success" : rate >= 50 ? "warning" : "destructive";
  return (
    <Badge
      variant={
        variant === "success"
          ? "default"
          : variant === "warning"
            ? "secondary"
            : "destructive"
      }
      className={cn(
        "shrink-0 min-w-[48px] justify-center",
        variant === "success" && "bg-green-100 text-green-800 hover:bg-green-100",
        variant === "warning" &&
          "bg-orange-100 text-orange-800 hover:bg-orange-100",
      )}
    >
      {rate}%
    </Badge>
  );
}
