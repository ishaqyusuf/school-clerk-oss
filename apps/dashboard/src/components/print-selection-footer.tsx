"use client";

import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { studentDisplayName } from "@/utils/utils";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@school-clerk/ui/popover";
import {
  Sortable,
  SortableDragHandle,
  SortableItem,
} from "@school-clerk/ui/sortable";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronUpIcon,
  GripVerticalIcon,
  PrinterIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { _trpc } from "./static-trpc";

export function PrintSelectionFooter() {
  const { filters, setFilters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { mutate: savePrintLog, isPending: isSaving } = useMutation(
    _trpc.assessments.savePrintLog.mutationOptions({
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
            name: studentDisplayName(report.student),
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
    // Collect unique department IDs for the print log
    const departmentIds = [
      ...new Set(
        selectedStudents.map((s) => {
          const report = ctx.reportsById?.[s.termFormId];
          return report?.departmentId ?? "";
        }),
      ),
    ].filter(Boolean);

    savePrintLog({
      termFormIds: printOrder,
      departmentIds,
      termId: filters.termId ?? undefined,
    });

    window.print();
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
          className="gap-2 shrink-0"
          onClick={handlePrint}
          disabled={isSaving}
        >
          <PrinterIcon className="size-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
