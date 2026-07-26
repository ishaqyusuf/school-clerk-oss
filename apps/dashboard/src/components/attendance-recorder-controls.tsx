"use client";

import {
  RECORDABLE_ATTENDANCE_STATUSES,
  type RecordableAttendanceStatus,
} from "@/lib/attendance";
import { Button } from "@school-clerk/ui/button";
import { Calendar } from "@school-clerk/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@school-clerk/ui/popover";
import { addDays, format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";

export function AttendanceDatePicker({
  hasError = false,
  id,
  onChange,
  value,
}: {
  hasError?: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T12:00:00`) : undefined;

  const shiftDate = (days: number) => {
    onChange(format(addDays(selectedDate ?? new Date(), days), "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <div className="flex w-full min-w-0 items-center sm:w-auto">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="shrink-0 rounded-r-none"
        aria-label="Previous attendance date"
        onClick={() => shiftDate(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label="Attendance date"
            aria-invalid={hasError}
            className="min-w-0 flex-1 justify-center rounded-none border-x-0 px-2 font-normal sm:w-44 sm:flex-none"
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
            <span className="truncate">
              {selectedDate
                ? format(selectedDate, "dd MMM yyyy")
                : "Pick a date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-auto overflow-hidden p-0"
          sideOffset={6}
        >
          <Calendar
            autoFocus
            captionLayout="dropdown"
            defaultMonth={selectedDate}
            endMonth={new Date(new Date().getFullYear() + 20, 11)}
            mode="single"
            selected={selectedDate}
            startMonth={new Date(2000, 0)}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="shrink-0 rounded-l-none"
        aria-label="Next attendance date"
        onClick={() => shiftDate(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

export function AttendanceBulkActions({
  disabled = false,
  onApply,
  onClear,
}: {
  disabled?: boolean;
  onApply: (status: RecordableAttendanceStatus, mode: "all" | "rest") => void;
  onClear: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Attendance bulk actions"
          disabled={disabled}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(
          [
            { label: "Mark all as", mode: "all" },
            { label: "Mark rest as", mode: "rest" },
          ] as const
        ).map((action) => (
          <DropdownMenuSub key={action.mode}>
            <DropdownMenuSubTrigger>{action.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {RECORDABLE_ATTENDANCE_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={`${action.mode}-${status.value}`}
                  onSelect={() => onApply(status.value, action.mode)}
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onClear}>Clear all</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
