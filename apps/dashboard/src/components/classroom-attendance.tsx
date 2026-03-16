"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { TableSkeleton } from "./tables/skeleton";
import { format } from "date-fns";

export function ClassroomAttendance({ departmentId }: { departmentId?: string | null }) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content departmentId={departmentId} />
    </Suspense>
  );
}

function Content({ departmentId }: { departmentId?: string | null }) {
  const { setParams } = useClassroomParams();
  const trpc = useTRPC();
  const { data: sessions } = useSuspenseQuery(
    trpc.attendance.getClassroomAttendance.queryOptions(
      { departmentId: departmentId || "-" },
      { enabled: !!departmentId }
    )
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="xs"
          onClick={() => setParams({ secondaryTab: "attendance-form" })}
        >
          Take Attendance
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <span>No attendance records yet.</span>
          <span>Click &quot;Take Attendance&quot; to record a session.</span>
        </div>
      ) : (
        <div className="divide-y">
          {sessions.map((session) => (
            <div key={session.id} className="py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{session.attendanceTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {session.createdAt
                    ? format(new Date(session.createdAt), "dd MMM yyyy")
                    : ""}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="text-green-600 border-green-300">
                  {session.present} present
                </Badge>
                <Badge variant="outline" className="text-red-500 border-red-300">
                  {session.absent} absent
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
