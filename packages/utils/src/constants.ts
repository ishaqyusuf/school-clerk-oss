export const STUDENT_PAGE_STATUS_FILTERS = [
  "show all",
  "enrolled",
  "not enrolled",
  "no enrollement record",
] as const;

export const daysFilters = [
  "yesterday",
  "today",
  // "tomorrow",
  "this week",
  "last week",
  // 'next week',
  "this month",
  "last month",
  "last 2 months",
  "last 6 months",
  // "this year",
  // "last year",
] as const;
export type DaysFilters = (typeof daysFilters)[number];
