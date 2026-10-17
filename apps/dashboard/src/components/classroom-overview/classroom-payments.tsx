"use client";

import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Progress } from "@school-clerk/ui/progress";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Receipt } from "lucide-react";
import { ClassroomSectionHeader } from "./classroom-section-nav";
import {
  classroomChargesInput,
  useClassroomFinanceAccess,
} from "./use-classroom-metrics";

export type ClassroomPaymentCharge = {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  outstanding: number;
  status: string;
  collectionStatus?: string | null;
  studentName?: string | null;
  student?: {
    id: string;
    name?: string | null;
    surname?: string | null;
    otherName?: string | null;
  } | null;
  stream?: { name?: string | null } | null;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function ClassroomPayments({
  departmentId,
  sessionId,
  termId,
}: {
  departmentId?: string | null;
  sessionId?: string | null;
  termId?: string | null;
}) {
  const trpc = useTRPC();
  const finance = useClassroomFinanceAccess();
  const { setParams: setPaymentParams } = useReceivePaymentParams();
  const { setParams: setStudentParams } = useStudentParams();
  const { data = [], isLoading, isError } = useQuery(
    trpc.finance.getCharges.queryOptions(
      classroomChargesInput({ departmentId, sessionId, termId }),
      {
        enabled: Boolean(departmentId) && finance.financeEnabled,
        retry: false,
      },
    ),
  );
  const status: PaymentsStatus = !finance.ready
    ? "loading"
    : !finance.financeEnabled
      ? "disabled"
      : isError
        ? "error"
        : isLoading
          ? "loading"
          : "ready";

  return (
    <ClassroomPaymentsView
      status={status}
      charges={data as ClassroomPaymentCharge[]}
      onReceivePayment={(charge) =>
        setPaymentParams({
          receivePayment: true,
          receivePaymentStudentId: charge?.student?.id ?? null,
          receivePaymentStudentName: charge?.student?.id
            ? null
            : (charge?.studentName ?? null),
          receivePaymentChargeId: charge?.id ?? null,
        })
      }
      onOpenStudent={(studentId) =>
        setStudentParams({
          studentViewId: studentId,
          studentViewTermId: termId ?? null,
        })
      }
    />
  );
}

export type PaymentsStatus = "loading" | "disabled" | "error" | "ready";

export function ClassroomPaymentsView({
  status,
  charges,
  onReceivePayment,
  onOpenStudent,
}: {
  status: PaymentsStatus;
  charges: ClassroomPaymentCharge[];
  onReceivePayment: (charge?: ClassroomPaymentCharge) => void;
  onOpenStudent: (studentId: string) => void;
}) {
  const totals = charges.reduce(
    (summary, charge) => {
      summary.billed += Number(charge.amount || 0);
      summary.paid += Number(charge.amountPaid || 0);
      if (Number(charge.outstanding || 0) <= 0) summary.paidCharges += 1;
      else summary.openCharges += 1;
      return summary;
    },
    { billed: 0, paid: 0, paidCharges: 0, openCharges: 0 },
  );
  const collectionRate =
    totals.billed > 0 ? Math.round((totals.paid / totals.billed) * 100) : 0;
  const sortedCharges = [...charges].sort(
    (a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0),
  );
  const canRecord = status === "ready";

  return (
    <div className="flex flex-col gap-4">
      <ClassroomSectionHeader
        title="Payments"
        description={
          status === "loading" ? (
            "Loading student charges…"
          ) : status === "disabled" ? (
            "Billing & Finance is not enabled for this school"
          ) : status === "error" ? (
            "Student charges could not be loaded"
          ) : charges.length ? (
            <>
              {naira.format(totals.billed)} billed ·{" "}
              {naira.format(totals.paid)} received · {totals.openCharges}{" "}
              outstanding, {totals.paidCharges} settled
            </>
          ) : (
            "No student charges this term"
          )
        }
        actions={
          canRecord ? (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => onReceivePayment()}
            >
              <Banknote className="size-4" />
              Receive payment
            </Button>
          ) : null
        }
      />

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-40" />
        </div>
      ) : status === "disabled" || status === "error" ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <Receipt className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">
            {status === "disabled"
              ? "Finance is turned off"
              : "Unable to load payments"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {status === "disabled"
              ? "Enable the Billing & Finance module in school settings to bill students and record payments here."
              : "You may not have access to school finance, or the request failed. Try again later."}
          </p>
        </div>
      ) : sortedCharges.length ? (
        <>
          <div className="flex items-center gap-3">
            <Progress
              value={collectionRate}
              className="h-1.5 flex-1"
              aria-label="Collection rate"
            />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {collectionRate}% collected · {totals.paidCharges}/
              {charges.length} paid
            </span>
          </div>
          <div className="divide-y rounded-lg border bg-card">
            {sortedCharges.map((charge) => {
              const isPaid = Number(charge.outstanding || 0) <= 0;
              const studentId = charge.student?.id;
              return (
                <div key={charge.id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    disabled={!studentId}
                    onClick={() => studentId && onOpenStudent(studentId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Receipt className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium" dir="auto">
                          {charge.studentName || "Student"}
                        </p>
                        <PaymentStatusBadge
                          status={
                            isPaid
                              ? "PAID"
                              : charge.collectionStatus || charge.status
                          }
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {[charge.title, charge.stream?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </button>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        isPaid ? "text-emerald-600" : "text-orange-600",
                      )}
                    >
                      {naira.format(
                        Number(isPaid ? charge.amountPaid : charge.outstanding) ||
                          0,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      paid {naira.format(Number(charge.amountPaid) || 0)}
                    </p>
                  </div>
                  {!isPaid ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReceivePayment(charge)}
                    >
                      Record
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-center">
          <Receipt className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No student charges</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Payments recorded for this classroom will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "PENDING").replace(/_/g, " ").toLowerCase();
  const isPaid = status === "PAID" || status === "COLLECTED";
  return (
    <Badge
      variant={isPaid ? "success" : "outline"}
      className={cn(
        "h-5 rounded-none px-1.5 text-[10px]",
        !isPaid && "border-orange-300 text-orange-700",
      )}
    >
      {isPaid ? "paid" : normalized}
    </Badge>
  );
}
