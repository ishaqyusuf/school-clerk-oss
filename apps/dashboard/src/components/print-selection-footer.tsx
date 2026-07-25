"use client";

import { useStudentNameFormatter } from "@/components/student-name-format/provider";
import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";
import {
  Sortable,
  SortableDragHandle,
  SortableItem,
} from "@school-clerk/ui/sortable";
import { toast } from "@school-clerk/ui/use-toast";
import {
  createSaveReportPrintInput,
  initialReportPrintConfirmationState,
  reportPrintConfirmationReducer,
} from "@school-clerk/assessment-results";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronUpIcon,
  FileTextIcon,
  GripVerticalIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react";
import { useReducer, useState } from "react";
import { _trpc } from "./static-trpc";

export function PrintSelectionFooter() {
  const { filters, setFilters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmationState, dispatchConfirmation] = useReducer(
    reportPrintConfirmationReducer,
    initialReportPrintConfirmationState,
  );
  const { pendingPrint, saveFailed } = confirmationState;
  const queryClient = useQueryClient();
	const formatStudentName = useStudentNameFormatter();

  const {
    mutate: savePrintLog,
    isPending: isSaving,
    reset: resetSavePrintLog,
  } = useMutation(
    _trpc.assessments.savePrintLog.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: _trpc.assessments.getPrintStatus.queryKey(),
        });
        dispatchConfirmation({ type: "save-succeeded" });
      },
      onError: () => {
        dispatchConfirmation({ type: "save-failed" });
      },
      meta: {
        toastTitle: {
          error: "Failed to save print log",
          loading: "Saving print log...",
          success: "Print log saved",
        },
      },
    }),
  );

  const printOrder = filters.printOrder ?? [];

  // Build ordered list of {id, termFormId, name, departmentName} for the dropdown
  const selectedStudents = printOrder
    .map((termFormId) => {
      const report = ctx.reportsById?.[termFormId];
      return report
        ? {
            id: termFormId,
            termFormId,
						name: formatStudentName(report.student),
            departmentName: report.departmentName ?? "",
          }
        : null;
    })
    .filter(Boolean) as {
    id: string;
    termFormId: string;
    name: string;
    departmentName: string;
  }[];

  if (printOrder.length === 0) return null;

  function handlePrint() {
    if (!filters.termId) return;
    resetSavePrintLog();
    const termFormIds = [...printOrder];
    window.print();
    dispatchConfirmation({
      type: "print-completed",
      payload: {
        source: "browser",
        termFormIds,
        termId: filters.termId,
      },
    });
  }

  function handlePrintV2() {
    if (!filters.termId) return;
    resetSavePrintLog();
    const termFormIds = [...printOrder];
    const params = new URLSearchParams({
      termFormIds: termFormIds.join(","),
    });

    params.set("termId", filters.termId);

    const url = `/api/pdf/result?${params.toString()}`;
    const popup = window.open(url, "_blank");

    if (!popup) {
      toast({
        title: "Unable to open report PDF",
        description:
          "Allow pop-ups for this site, then try Print v2 again. No print history was recorded.",
        variant: "destructive",
      });
      return;
    }
    popup.opener = null;

    dispatchConfirmation({
      type: "print-completed",
      payload: {
        source: "pdf",
        termFormIds,
        termId: filters.termId,
      },
    });
  }

  function recordPrint() {
    if (!pendingPrint) return;

    savePrintLog(createSaveReportPrintInput(pendingPrint));
  }

  function removeStudent(termFormId: string) {
    setFilters({
      printOrder: printOrder.filter((id) => id !== termFormId),
    });
  }

  function reorder(items: typeof selectedStudents) {
    setFilters({ printOrder: items.map((s) => s.termFormId) });
  }

  function clearAll() {
    setFilters({ printOrder: [] });
    setPopoverOpen(false);
  }

  return (
    <>
    <div className="print:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto">
        {/* Selection summary */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {printOrder.length}
          </Badge>
          <span className="text-sm text-muted-foreground truncate">
            {printOrder.length === 1
              ? "student selected for printing"
              : "students selected for printing"}
          </span>
        </div>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={clearAll}
        >
          <XIcon className="size-4" />
          Clear
        </Button>

        {/* Dropdown toggle showing selected students */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <ChevronUpIcon
                className={cn(
                  "size-4 transition-transform duration-200",
                  popoverOpen ? "rotate-180" : "",
                )}
              />
              Print order
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-80 p-0"
            sideOffset={8}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-medium">
                Print order ({selectedStudents.length})
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                onClick={clearAll}
              >
                Clear all
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <Sortable
                value={selectedStudents}
                onValueChange={reorder}
                orientation="vertical"
              >
                {selectedStudents.map((student, index) => (
                  <SortableItem key={student.id} value={student.id} asChild>
                    <div className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 bg-background hover:bg-muted/50 transition-colors">
                      {/* SN */}
                      <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">
                        {index + 1}.
                      </span>
                      {/* Student info */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {student.name}
                        </span>
                        {student.departmentName && (
                          <span className="text-xs text-muted-foreground truncate">
                            {student.departmentName}
                          </span>
                        )}
                      </div>
                      {/* Drag handle */}
                      <SortableDragHandle
                        variant="ghost"
                        size="xs"
                        className="size-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <GripVerticalIcon className="size-3.5" />
                      </SortableDragHandle>
                      {/* Remove */}
                      <button
                        type="button"
                        className="size-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded shrink-0"
                        onClick={() => removeStudent(student.termFormId)}
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  </SortableItem>
                ))}
              </Sortable>
            </div>
          </PopoverContent>
        </Popover>

        {/* Print button */}
        <Button
          size="sm"
          variant="outline"
          className="gap-2 shrink-0"
          onClick={handlePrintV2}
          disabled={isSaving || !filters.termId}
        >
          <FileTextIcon className="size-4" />
          Print v2
        </Button>

        <Button
          size="sm"
          className="gap-2 shrink-0"
          onClick={handlePrint}
          disabled={isSaving || !filters.termId}
        >
          <PrinterIcon className="size-4" />
          Print
        </Button>
      </div>
    </div>
    <AlertDialog
      open={Boolean(pendingPrint)}
      onOpenChange={(open) => {
        if (!open && !isSaving) {
          dispatchConfirmation({ type: "dismissed" });
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Record this report print?</AlertDialogTitle>
          <AlertDialogDescription>
            Mark {pendingPrint?.termFormIds.length ?? 0}{" "}
            {(pendingPrint?.termFormIds.length ?? 0) === 1
              ? "student"
              : "students"}{" "}
            as printed now. This will update their print history for the selected
            term.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {saveFailed ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            The print could not be recorded. Check your connection and choose
            Record print to try again.
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>
            Don&apos;t record
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={recordPrint}
            disabled={isSaving}
          >
            {isSaving
              ? "Recording..."
              : saveFailed
                ? "Try again"
                : "Record print"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
