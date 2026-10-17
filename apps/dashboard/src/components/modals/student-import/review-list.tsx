"use client";

import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  CheckCircle2,
  ChevronRight,
  Import,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { type ReactNode, memo, useMemo, useRef } from "react";

export type ReviewGroupKey = "attention" | "matched" | "ready" | "imported";

export type ReviewRowTone = "attention" | "danger" | "neutral" | "muted" | "success";

/** Flat, primitive-only row view model so memoized rows skip re-rendering when unrelated rows change. */
export type ReviewListRow = {
  lineNumber: number;
  group: ReviewGroupKey;
  primaryName: string;
  secondaryName: string;
  dir: "ltr" | "rtl";
  initials: string;
  statusText: string;
  tone: ReviewRowTone;
  checked: boolean;
  imported: boolean;
  importing: boolean;
  /** Row has no blockers, is not skipped and has not been imported. */
  canImport: boolean;
  blocked: boolean;
};

export type ReviewGroup = {
  key: ReviewGroupKey;
  title: string;
  rows: ReviewListRow[];
};

const GROUP_DOT: Record<ReviewGroupKey, string> = {
  attention: "bg-amber-500",
  matched: "bg-sky-500",
  ready: "bg-emerald-500",
  imported: "bg-muted-foreground/50",
};

const TONE_TEXT: Record<ReviewRowTone, string> = {
  attention: "text-amber-700 dark:text-amber-300",
  danger: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
  muted: "text-muted-foreground/80",
  success: "text-emerald-700 dark:text-emerald-400",
};

type Item =
  | { kind: "header"; key: string; group: ReviewGroup }
  | { kind: "row"; key: string; row: ReviewListRow };

type Props = {
  groups: ReviewGroup[];
  compact: boolean;
  expandedLineNumber: number | null;
  /** Any row importing blocks other single-row imports (one request at a time). */
  isAnyRowImporting: boolean;
  renderExpanded: (lineNumber: number) => ReactNode;
  onToggleChecked: (lineNumber: number, checked: boolean) => void;
  onOpenRow: (lineNumber: number) => void;
  onImportRow: (lineNumber: number) => void;
  onGroupChecked: (group: ReviewGroupKey, checked: boolean) => void;
  emptyState?: ReactNode;
};

/**
 * Quiet list review (Workshop students/batch-import · 01). Groups render as one virtualized
 * scroller so thousands of pasted rows stay responsive; only the expanded row mounts the
 * heavier edit controls.
 */
export function StudentImportReviewList({
  groups,
  compact,
  expandedLineNumber,
  isAnyRowImporting,
  renderExpanded,
  onToggleChecked,
  onOpenRow,
  onImportRow,
  onGroupChecked,
  emptyState,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = useMemo<Item[]>(() => {
    const next: Item[] = [];
    for (const group of groups) {
      if (!group.rows.length) continue;
      next.push({ kind: "header", key: `h-${group.key}`, group });
      for (const row of group.rows) {
        next.push({ kind: "row", key: `r-${row.lineNumber}`, row });
      }
    }
    return next;
  }, [groups]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (items[index]?.kind === "header" ? 44 : 60),
    getItemKey: (index) => items[index]?.key ?? index,
    overscan: 10,
  });

  if (!items.length) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {emptyState ?? "No rows in this view."}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      data-testid="student-import-review-list"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {item.kind === "header" ? (
                <GroupHeader group={item.group} onGroupChecked={onGroupChecked} />
              ) : (
                <>
                  <ReviewRow
                    row={item.row}
                    compact={compact}
                    expanded={!compact && expandedLineNumber === item.row.lineNumber}
                    importDisabled={isAnyRowImporting && !item.row.importing}
                    onToggleChecked={onToggleChecked}
                    onOpenRow={onOpenRow}
                    onImportRow={onImportRow}
                  />
                  {!compact && expandedLineNumber === item.row.lineNumber ? (
                    <div className="border-b bg-muted/20 px-3 pt-1 pb-4 sm:pl-[4.5rem]">
                      {renderExpanded(item.row.lineNumber)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupHeader({
  group,
  onGroupChecked,
}: {
  group: ReviewGroup;
  onGroupChecked: (group: ReviewGroupKey, checked: boolean) => void;
}) {
  const selectableRows = group.rows.filter((row) => !row.imported);
  const selectable = group.key !== "imported" && selectableRows.length > 0;
  const allChecked = selectable && selectableRows.every((row) => row.checked);

  return (
    <div className="flex h-11 items-center gap-2 border-b bg-background px-3 pt-3 pb-1.5">
      <span className={cn("size-1.5 rounded-full", GROUP_DOT[group.key])} aria-hidden="true" />
      <h3 className="text-xs font-semibold tracking-wide text-foreground">
        {group.title}
      </h3>
      <span className="text-xs tabular-nums text-muted-foreground">{group.rows.length}</span>
      {selectable ? (
        <button
          type="button"
          className="ml-auto rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onGroupChecked(group.key, !allChecked)}
        >
          {allChecked ? "Select none" : "Select all"}
        </button>
      ) : null}
    </div>
  );
}

const ReviewRow = memo(function ReviewRow({
  row,
  compact,
  expanded,
  importDisabled,
  onToggleChecked,
  onOpenRow,
  onImportRow,
}: {
  row: ReviewListRow;
  compact: boolean;
  expanded: boolean;
  importDisabled: boolean;
  onToggleChecked: (lineNumber: number, checked: boolean) => void;
  onOpenRow: (lineNumber: number) => void;
  onImportRow: (lineNumber: number) => void;
}) {
  const label = `${row.primaryName} ${row.secondaryName}`.trim();

  return (
    <div
      data-line={row.lineNumber}
      className={cn(
        "group flex min-h-[3.75rem] items-center gap-3 border-b px-3 transition-colors",
        expanded ? "bg-muted/30" : "hover:bg-muted/30",
        row.imported && "opacity-80",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center">
        <Checkbox
          checked={row.checked}
          disabled={row.imported}
          onCheckedChange={(value) => onToggleChecked(row.lineNumber, value === true)}
          aria-label={`Include ${label} in batch import`}
          className="size-[18px]"
        />
      </div>

      <button
        type="button"
        aria-expanded={compact ? undefined : expanded}
        aria-haspopup={compact ? "dialog" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={() => onOpenRow(row.lineNumber)}
      >
        {!compact ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">
            {row.initials}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          {/* Names stay start-aligned with their status line; one directional <bdi> keeps the
              parts of an Arabic name in reading order. */}
          <span className="block truncate text-sm leading-5">
            <bdi dir={row.dir}>
              <span className="font-medium text-foreground">{row.primaryName}</span>
              {row.secondaryName ? (
                <span className="text-muted-foreground"> {row.secondaryName}</span>
              ) : null}
            </bdi>
          </span>
          <span className={cn("mt-0.5 block truncate text-xs leading-4", TONE_TEXT[row.tone])}>
            {row.statusText}
          </span>
        </span>
      </button>

      <RowAction
        row={row}
        compact={compact}
        expanded={expanded}
        importDisabled={importDisabled}
        label={label}
        onOpenRow={onOpenRow}
        onImportRow={onImportRow}
      />
    </div>
  );
});

function RowAction({
  row,
  compact,
  expanded,
  importDisabled,
  label,
  onOpenRow,
  onImportRow,
}: {
  row: ReviewListRow;
  compact: boolean;
  expanded: boolean;
  importDisabled: boolean;
  label: string;
  onOpenRow: (lineNumber: number) => void;
  onImportRow: (lineNumber: number) => void;
}) {
  if (row.importing) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
        {compact ? <span className="sr-only">Importing</span> : "Importing"}
      </span>
    );
  }

  if (row.imported) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {compact ? <span className="sr-only">Imported</span> : "Imported"}
      </span>
    );
  }

  if (compact) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        {row.canImport ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10"
            disabled={importDisabled}
            aria-label={`Import ${label}`}
            onClick={() => onImportRow(row.lineNumber)}
          >
            <Import className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }

  if (row.canImport) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5"
        disabled={importDisabled}
        aria-label={`Import ${label}`}
        onClick={() => onImportRow(row.lineNumber)}
      >
        <Import className="size-3.5" aria-hidden="true" />
        Import
      </Button>
    );
  }

  if (row.blocked) {
    return (
      <Button
        type="button"
        variant={expanded ? "secondary" : "outline"}
        size="sm"
        className="h-8 shrink-0 gap-1.5"
        aria-label={`Fix ${label}`}
        aria-expanded={expanded}
        onClick={() => onOpenRow(row.lineNumber)}
      >
        <PencilLine className="size-3.5" aria-hidden="true" />
        Fix
      </Button>
    );
  }

  return <span className="shrink-0 text-xs text-muted-foreground">Skipped</span>;
}
