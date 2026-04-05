"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, MinusCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { TableSkeleton } from "@/components/tables/skeleton";
import { cn } from "@school-clerk/ui/cn";
import { WaiveFeeDialog } from "./waive-fee-dialog";

type CollectionStatus = "ALL" | "PENDING" | "PARTIAL" | "PAID" | "WAIVED" | "OVERDUE";

const STATUS_FILTERS: { value: CollectionStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Unpaid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "WAIVED", label: "Waived" },
];

interface Props {
  classroomId: string;
  classroomName: string | null;
  onBack: () => void;
}

export function CollectionStudents({ classroomId, classroomName, onBack }: Props) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <CollectionStudentsContent
        classroomId={classroomId}
        classroomName={classroomName}
        onBack={onBack}
      />
    </Suspense>
  );
}

function CollectionStudentsContent({ classroomId, classroomName, onBack }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CollectionStatus>("ALL");
  const [waiveFeeId, setWaiveFeeId] = useState<string | null>(null);

  const { data } = useSuspenseQuery(
    trpc.finance.getCollectionStudents.queryOptions({
      classroomId,
      collectionStatus: statusFilter,
    }),
  );

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: trpc.finance.getCollectionStudents.queryKey({
        classroomId,
        collectionStatus: statusFilter,
      }),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="font-semibold text-sm">{classroomName || "Classroom"}</h2>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {!data.length ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No students match this filter.
            </div>
          ) : (
            <div className="divide-y">
              {data.map((student) => (
                <div key={student.studentTermFormId} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{student.studentName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                        <span>
                          Billed:{" "}
                          <span className="font-mono">
                            <AnimatedNumber value={student.totalBilled} />
                          </span>
                        </span>
                        <span>
                          Paid:{" "}
                          <span className="font-mono text-green-600">
                            <AnimatedNumber value={student.totalPaid} />
                          </span>
                        </span>
                        {student.totalPending > 0 && (
                          <span>
                            Owing:{" "}
                            <span className="font-mono text-orange-600">
                              <AnimatedNumber value={student.totalPending} />
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <CollectionStatusBadge status={student.collectionStatus} />
                  </div>

                  {/* Individual fee rows */}
                  {student.fees.length > 0 && (
                    <div className="mt-2 pl-2 flex flex-col gap-1">
                      {student.fees.map((fee) => (
                        <div
                          key={fee.id}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span className="truncate max-w-[180px]">{fee.title}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono">
                              <AnimatedNumber value={fee.billAmount} />
                            </span>
                            {fee.pendingAmount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-xs text-orange-600 hover:text-orange-700"
                                onClick={() => setWaiveFeeId(fee.id)}
                              >
                                Waive
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {waiveFeeId && (
        <WaiveFeeDialog
          studentFeeId={waiveFeeId}
          onClose={() => setWaiveFeeId(null)}
          onSuccess={() => {
            setWaiveFeeId(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function CollectionStatusBadge({ status }: { status: string }) {
  if (status === "PAID") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Partial
      </Badge>
    );
  }
  if (status === "WAIVED") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <MinusCircle className="h-3 w-3" /> Waived
      </Badge>
    );
  }
  if (status === "NO_FEES") {
    return <Badge variant="outline">No fees</Badge>;
  }
  return (
    <Badge
      variant="destructive"
      className="bg-orange-100 text-orange-800 hover:bg-orange-100 flex items-center gap-1"
    >
      <Clock className="h-3 w-3" /> Unpaid
    </Badge>
  );
}
