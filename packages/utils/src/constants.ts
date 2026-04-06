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

export const STAFF_ROLES = [
	"Admin",
	"Teacher",
	"Accountant",
	"Registrar",
	"HR",
	"Staff",
	"Support",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ASSIGNMENT_ROLES = ["Teacher"] as const;

export const STAFF_INVITE_STATUSES = [
	"NOT_SENT",
	"PENDING",
	"ACTIVE",
	"FAILED",
] as const;

export type StaffInviteStatus = (typeof STAFF_INVITE_STATUSES)[number];
