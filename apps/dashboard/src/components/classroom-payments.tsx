"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Card, CardContent } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import { AnimatedNumber } from "./animated-number";
import {
  Collapsible,
  CollapsibleContent,
} from "@school-clerk/ui/collapsible";
import {
  Banknote,
  Globe,
  Plus,
  School,
  Users,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@school-clerk/ui/cn";

interface Props {
  departmentId: string;
}

export function ClassroomPayments({ departmentId }: Props) {
  const { data: overview } = useSuspenseQuery(
    _trpc.classrooms.getClassroomOverview.queryOptions({ departmentId })
  );
  const classRoomId = overview?.classRoom?.id;

  if (!classRoomId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Classroom not found.
      </div>
    );
  }

  return <ClassroomPaymentsContent departmentId={departmentId} classRoomId={classRoomId} />;
}

function ClassroomPaymentsContent({
  departmentId,
  classRoomId,
}: {
  departmentId: string;
  classRoomId: string;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [showAddFee, setShowAddFee] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: trpc.transactions.getSchoolFees.queryKey(),
    });
  };

  // All fees for this classroom + general fees (all scopes)
  const { data: classroomFees } = useQuery(
    trpc.transactions.getSchoolFees.queryOptions({
      classRoomId,
    })
  );
  const { data: generalFees } = useQuery(
    trpc.transactions.getSchoolFees.queryOptions({
      classRoomId: null,
    })
  );

  // Bulk init mutation
  const { mutate: bulkInit, isPending: bulkInitPending } = useMutation(
    trpc.transactions.bulkInitializeClassFees.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Initializing fees...",
          success: "Fees initialized for all students",
          error: "Failed to initialize fees",
        },
      },
      onSuccess: invalidate,
    })
  );

  const allFees = [
    ...(classroomFees ?? []).map((f) => ({ ...f, scope: "classroom" as const })),
    ...(generalFees ?? []).map((f) => ({ ...f, scope: "general" as const })),
  ];

  const configuredCount = allFees.filter((f) => f.feeHistory.length > 0).length;

  return (
    <div className="space-y-5 p-1 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base">Payment Structures</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {configuredCount} fee{configuredCount !== 1 ? "s" : ""} configured for current term
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              bulkInit({ classRoomDepartmentId: departmentId })
            }
            disabled={bulkInitPending || configuredCount === 0}
          >
            <Users className="h-4 w-4" />
            Initialize All Students
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setShowAddFee((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Add Fee
          </Button>
        </div>
      </div>

      {/* Add Fee Form */}
      <Collapsible open={showAddFee}>
        <CollapsibleContent>
          <AddClassroomFeeForm
            classRoomId={classRoomId}
            onSuccess={() => {
              setShowAddFee(false);
              invalidate();
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Fee list */}
      {allFees.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center">
          <AlertCircle className="h-7 w-7 text-muted-foreground mb-3" />
          <p className="font-medium text-sm">No payment structures yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a classroom-specific fee or configure general fees from Fee Management.
          </p>
        </Card>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {allFees.map((fee) => {
            const history = fee.feeHistory[0];
            const isConfigured = !!history;
            return (
              <div
                key={fee.id}
                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="shrink-0">
                  {isConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{fee.title}</span>
                    {fee.scope === "classroom" ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <School className="h-3 w-3" />
                        This Class
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 text-muted-foreground"
                      >
                        <Globe className="h-3 w-3" />
                        General
                      </Badge>
                    )}
                  </div>
                  {fee.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fee.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isConfigured ? (
                    <div>
                      <p className="text-sm font-bold">
                        <AnimatedNumber value={history.amount} currency="NGN" />
                      </p>
                      <Badge className="text-[10px] bg-green-50 text-green-700 border-green-200 mt-0.5">
                        Active
                      </Badge>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      Not configured
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddClassroomFeeForm({
  classRoomId,
  onSuccess,
}: {
  classRoomId: string;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { mutate, isPending } = useMutation(
    trpc.transactions.createSchoolFee.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating fee...",
          success: "Fee created",
          error: "Failed to create fee",
        },
      },
      onSuccess,
    })
  );

  // We need termId — fetch from profile via a separate query or pass it down
  const { data: termFees } = useQuery(
    trpc.transactions.getTermFees.queryOptions({ termId: "placeholder" }),
    { enabled: false }
  );

  // Use current term from profile — access via a simple query
  const { data: dashboardData } = useQuery(
    _trpc.academics.dashboard.queryOptions({})
  );
  const currentTermId = dashboardData?.currentTerm?.id;

  const canSubmit = title.trim() && amount && currentTermId;

  return (
    <div className="border border-dashed border-border rounded-lg p-4 bg-muted/20 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        New Classroom Fee
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Fee Title</Label>
          <Input
            placeholder="e.g. Tuition Fee"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Amount (NGN)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Description (optional)</Label>
          <Input
            placeholder="Optional note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      {!currentTermId && (
        <p className="text-xs text-amber-600">
          No active term found — fee will be created without term configuration.
        </p>
      )}
      <div className="flex gap-2">
        <SubmitButton
          isSubmitting={isPending}
          disabled={!canSubmit}
          type="button"
          onClick={() =>
            mutate({
              title: title.trim(),
              amount: parseFloat(amount),
              description: description || undefined,
              termId: currentTermId!,
              classRoomId,
            })
          }
        >
          Create Fee
        </SubmitButton>
        <Button variant="ghost" size="sm" type="button" onClick={onSuccess}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
