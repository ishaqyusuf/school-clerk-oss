"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Card, CardContent } from "@school-clerk/ui/card";
import { SubmitButton } from "./submit-button";
import { AnimatedNumber } from "./animated-number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import {
  Search,
  User,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Banknote,
} from "lucide-react";
import { cn } from "@school-clerk/ui/cn";
import { applyPaymentSchema } from "@api/db/queries/accounting";
import { useZodForm } from "@/hooks/use-zod-form";
import { Form } from "@school-clerk/ui/form";
import { FormInput } from "@school-clerk/ui/controls/form-input";

export function StudentPaymentPortal() {
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTermFormId, setSelectedTermFormId] = useState<string | null>(null);

  // Debounce search
  const handleSearch = (v: string) => {
    setSearchQuery(v);
    clearTimeout((window as any).__portalSearchTimer);
    (window as any).__portalSearchTimer = setTimeout(() => setDebouncedQuery(v), 350);
  };

  const { data: searchResults, isFetching } = useQuery(
    trpc.transactions.searchStudents.queryOptions(
      { query: debouncedQuery },
      { enabled: debouncedQuery.length >= 2 }
    )
  );

  const selectedStudent = searchResults?.find((s) => s.id === selectedStudentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Search + student list */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search student by name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {debouncedQuery.length >= 2 && (
          <div className="space-y-1">
            {isFetching && (
              <p className="text-xs text-muted-foreground px-1">Searching...</p>
            )}
            {!isFetching && searchResults?.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No students found.</p>
            )}
            {searchResults?.map((student) => (
              <button
                key={student.id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg border transition-colors flex items-center gap-3",
                  selectedStudentId === student.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/30"
                )}
                onClick={() => {
                  setSelectedStudentId(student.id);
                  setSelectedTermFormId(student.currentTermFormId);
                }}
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  {student.currentClass && (
                    <p className="text-xs text-muted-foreground">{student.currentClass}</p>
                  )}
                </div>
                {student.totalOutstanding > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-red-600 border-red-200 bg-red-50 shrink-0"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <AnimatedNumber value={student.totalOutstanding} currency="NGN" />
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {debouncedQuery.length < 2 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Search className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </div>
        )}
      </div>

      {/* Right: Student detail */}
      <div className="lg:col-span-2">
        {!selectedStudentId ? (
          <Card className="p-16 flex flex-col items-center text-center text-muted-foreground">
            <Banknote className="h-10 w-10 mb-4 opacity-30" />
            <p className="font-medium">Select a student to view their payment details</p>
          </Card>
        ) : (
          <StudentDetail
            studentId={selectedStudentId}
            studentName={selectedStudent?.name ?? ""}
            initialTermFormId={selectedTermFormId}
          />
        )}
      </div>
    </div>
  );
}

function StudentDetail({
  studentId,
  studentName,
  initialTermFormId,
}: {
  studentId: string;
  studentName: string;
  initialTermFormId: string | null;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [activeTermFormId, setActiveTermFormId] = useState(initialTermFormId);

  const { data: allTerms } = useQuery(
    trpc.transactions.getStudentAllTermsAccounting.queryOptions({ studentId })
  );

  const activeTerm = allTerms?.find((t) => t.studentTermFormId === activeTermFormId)
    ?? allTerms?.[0];

  const { data: feeStatus, refetch: refetchFeeStatus } = useQuery(
    trpc.transactions.getStudentFeeStatus.queryOptions(
      { studentTermFormId: activeTermFormId! },
      { enabled: !!activeTermFormId }
    )
  );

  const { mutate: initializeFees, isPending: initializingFees } = useMutation(
    trpc.transactions.initializeStudentFees.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Initializing fees...",
          success: "Fees initialized",
          error: "Failed to initialize",
        },
      },
      onSuccess() {
        refetchFeeStatus();
        qc.invalidateQueries({
          queryKey: trpc.transactions.getStudentAllTermsAccounting.queryKey({ studentId }),
        });
      },
    })
  );

  const invalidatePayments = () => {
    refetchFeeStatus();
    qc.invalidateQueries({
      queryKey: trpc.transactions.getStudentAllTermsAccounting.queryKey({ studentId }),
    });
    qc.invalidateQueries({
      queryKey: trpc.transactions.studentAccounting.queryKey({ studentId }),
    });
  };

  const totalOutstanding = allTerms?.reduce((s, t) => s + t.totalPending, 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Student header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{studentName}</h2>
          {totalOutstanding > 0 && (
            <p className="text-sm text-red-600 font-medium mt-0.5">
              Total outstanding: <AnimatedNumber value={totalOutstanding} currency="NGN" />
            </p>
          )}
        </div>
      </div>

      {/* Term selector */}
      {allTerms && allTerms.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allTerms.map((term) => (
            <button
              key={term.studentTermFormId}
              type="button"
              onClick={() => setActiveTermFormId(term.studentTermFormId)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                term.studentTermFormId === activeTermFormId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted/30 text-foreground"
              )}
            >
              {term.termTitle} · {term.sessionTitle}
              {term.totalPending > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {term.totalPending.toLocaleString()}
                </span>
              )}
              {term.isCurrentTerm && (
                <span className="ml-1.5 text-[10px] opacity-70">(current)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeTerm && (
        <>
          {/* Term summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Invoiced</p>
              <p className="text-lg font-bold mt-1">
                <AnimatedNumber value={activeTerm.totalInvoiced} currency="NGN" />
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-bold mt-1 text-green-600">
                <AnimatedNumber value={activeTerm.totalPaid} currency="NGN" />
              </p>
            </Card>
            <Card className="p-4 border-red-100 dark:border-red-900/30">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold mt-1 text-red-600">
                <AnimatedNumber value={activeTerm.totalPending} currency="NGN" />
              </p>
            </Card>
          </div>

          {/* Uninitialized fees */}
          {feeStatus && feeStatus.uninitialized.length > 0 && (
            <Card className="overflow-hidden border-amber-100 dark:border-amber-900/30">
              <div className="px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-900/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {feeStatus.uninitialized.length} fee{feeStatus.uninitialized.length !== 1 ? "s" : ""} not initialized
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  disabled={initializingFees}
                  onClick={() => initializeFees({ studentTermFormId: activeTermFormId! })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Initialize All
                </Button>
              </div>
              <div className="divide-y divide-border">
                {feeStatus.uninitialized.map((fee) => (
                  <div key={fee.feeHistoryId} className="flex items-center gap-3 px-4 py-2.5">
                    <Circle className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fee.title}</p>
                      {fee.classRoomName && (
                        <p className="text-xs text-muted-foreground">{fee.classRoomName}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold">
                      <AnimatedNumber value={fee.amount} currency="NGN" />
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-xs"
                      disabled={initializingFees}
                      onClick={() =>
                        initializeFees({
                          studentTermFormId: activeTermFormId!,
                          feeHistoryIds: [fee.feeHistoryId],
                        })
                      }
                    >
                      Initialize
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Initialized fees + payment */}
          {activeTerm.fees.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-bold">Fee Breakdown</span>
              </div>
              <div className="divide-y divide-border">
                {activeTerm.fees.map((fee) => (
                  <div key={fee.id} className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fee.feeTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        <AnimatedNumber value={fee.billAmount} currency="NGN" />
                      </p>
                      {fee.pendingAmount > 0 ? (
                        <p className="text-xs text-red-600">
                          <AnimatedNumber value={fee.pendingAmount} currency="NGN" /> pending
                        </p>
                      ) : (
                        <p className="text-xs text-green-600">Paid</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Apply payment */}
          {activeTerm.totalPending > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b">
                <span className="text-sm font-bold">Apply Payment</span>
                {!activeTerm.isCurrentTerm && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    Payment will be recorded in the current term's stream.
                  </p>
                )}
              </div>
              <div className="p-4">
                <PortalPaymentForm
                  studentId={studentId}
                  studentTermFormId={activeTermFormId!}
                  owingAmount={activeTerm.totalPending}
                  onSuccess={invalidatePayments}
                />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PortalPaymentForm({
  studentId,
  studentTermFormId,
  owingAmount,
  onSuccess,
}: {
  studentId: string;
  studentTermFormId: string;
  owingAmount: number;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const form = useZodForm(applyPaymentSchema, {
    defaultValues: { studentId, pendingAmount: owingAmount, amount: null },
  });
  const { isPending, mutate } = useMutation(
    trpc.transactions.applyPayment.mutationOptions({
      onSuccess() {
        onSuccess();
        form.reset();
      },
      meta: {
        toastTitle: {
          loading: "Applying payment...",
          success: "Payment applied",
          error: "Unable to complete",
        },
      },
    })
  );

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-3"
        // termId is intentionally omitted — defaults to ctx.profile.termId so
        // payments on previous-term fees are credited to the current term's stream
        onSubmit={form.handleSubmit((data) => mutate(data))}
      >
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Amount (NGN)"
            control={form.control}
            name="amount"
            numericProps={{
              prefix: "NGN ",
              suffix: ` /NGN ${owingAmount}`,
              placeholder: "0",
            }}
          />
          <div className="grid gap-1.5">
            <Label className="text-sm">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Card">Card (POS)</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <SubmitButton isSubmitting={isPending}>Apply Payment</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
