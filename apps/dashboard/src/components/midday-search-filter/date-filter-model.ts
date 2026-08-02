import { daysFilters } from "@school-clerk/utils/constants";
import { format, formatISO } from "date-fns";

export function normalizeDateFilterValue(value: unknown) {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return parts
    .filter((part): part is string => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) => part && part !== "-" && part !== "null");
}

export function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    formatISO(date, { representation: "date" }) === value
  );
}

export function isValidDateFilterValue(value: unknown) {
  const parts = normalizeDateFilterValue(value);
  if (parts.length < 1 || parts.length > 2) return false;

  const [from, to] = parts;
  if (!from) return false;

  if (
    parts.length === 1 &&
    daysFilters.includes(from as (typeof daysFilters)[number])
  ) {
    return true;
  }
  if (!parts.every(isValidCalendarDate)) return false;

  return !to || from <= to;
}

export function dateRangeSelectionToFilterValue(range?: {
  from?: Date;
  to?: Date;
}) {
  if (!range?.from) return null;

  const from = formatISO(range.from, { representation: "date" });
  if (!range.to) return [from];

  return [from, formatISO(range.to, { representation: "date" })];
}

export function dateFilterValueToSelection(value: unknown) {
  const [from, to] = normalizeDateFilterValue(value);
  if (!from || !isValidCalendarDate(from)) return undefined;

  return {
    from: new Date(`${from}T00:00:00`),
    to: to && isValidCalendarDate(to) ? new Date(`${to}T00:00:00`) : undefined,
  };
}

export function formatDateFilterLabel(value: unknown) {
  const [from, to] = normalizeDateFilterValue(value);
  if (!from) return "";
  if (!isValidCalendarDate(from)) {
    return from.charAt(0).toUpperCase() + from.slice(1);
  }

  const fromLabel = format(new Date(`${from}T00:00:00`), "MMM d, yyyy");
  if (!to || to === from || !isValidCalendarDate(to)) return fromLabel;

  return `${fromLabel} – ${format(new Date(`${to}T00:00:00`), "MMM d, yyyy")}`;
}
