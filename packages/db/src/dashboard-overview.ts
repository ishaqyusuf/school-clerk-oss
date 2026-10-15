import type { Database } from "./prisma";

/**
 * School-day key (YYYY-MM-DD) in the school's time zone. Attendance dates are
 * stored as calendar dates, so "today" must not drift with the server's UTC clock.
 */
export function dashboardDayKey(now: Date, timeZone = "Africa/Lagos") {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

export type DashboardOverviewInput = {
	schoolId: string;
	sessionId: string;
	termId: string;
	now?: Date;
	timeZone?: string;
};

type Money = { toString(): string } | number | null | undefined;
const toNumber = (value: Money) => Number(value ?? 0) || 0;

const OPEN_CHARGE_EXCLUDED = ["DRAFT", "CANCELLED", "WAIVED"] as const;
const PRESENT_STATUSES = new Set(["PRESENT", "LATE"]);

/**
 * Read-only aggregate for the operations-console dashboard home:
 * term progress, fees for the term, today's class registers, per-class
 * fee completion, open items and the latest student payments.
 */
export async function getDashboardOverview(
	db: Database,
	{
		schoolId,
		sessionId,
		termId,
		now = new Date(),
		timeZone = "Africa/Lagos",
	}: DashboardOverviewInput,
) {
	const dayKey = dashboardDayKey(now, timeZone);
	const today = new Date(`${dayKey}T00:00:00.000Z`);
	// Lagos is UTC+1 with no DST; payment timestamps are compared on that boundary.
	const dayStart = new Date(today.getTime() - 60 * 60 * 1000);

	const activeTermForm = {
		schoolProfileId: schoolId,
		sessionTermId: termId,
		deletedAt: null,
		registrationReviewStatus: { not: "REJECTED" as const },
		student: { deletedAt: null },
	};

	const [
		term,
		departments,
		rosterCounts,
		registers,
		charges,
		collected,
		collectedToday,
		recentPayments,
		pendingRegistrations,
		unclassified,
		pendingApplications,
	] = await Promise.all([
		db.sessionTerm.findFirst({
			where: { id: termId, schoolId, deletedAt: null },
			select: {
				title: true,
				startDate: true,
				endDate: true,
				session: { select: { title: true } },
			},
		}),
		db.classRoomDepartment.findMany({
			where: {
				schoolProfileId: schoolId,
				deletedAt: null,
				classRoom: { schoolSessionId: sessionId, deletedAt: null },
			},
			select: {
				id: true,
				departmentName: true,
				departmentLevel: true,
				classRoom: { select: { name: true } },
			},
			orderBy: [{ departmentLevel: "asc" }, { departmentName: "asc" }],
		}),
		db.studentTermForm.groupBy({
			by: ["classroomDepartmentId"],
			where: activeTermForm,
			_count: { _all: true },
		}),
		db.classRoomAttendance.findMany({
			where: {
				schoolProfileId: schoolId,
				sessionTermId: termId,
				attendanceDate: today,
				deletedAt: null,
				departmentSubjectId: null,
			},
			select: {
				id: true,
				departmentId: true,
				createdAt: true,
				studentAttendanceList: {
					where: { deletedAt: null },
					select: { isPresent: true, status: true },
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		db.financeCharge.findMany({
			where: {
				schoolProfileId: schoolId,
				sessionTermId: termId,
				payerType: "STUDENT",
				deletedAt: null,
				status: { notIn: [...OPEN_CHARGE_EXCLUDED] },
			},
			select: {
				amount: true,
				amountPaid: true,
				studentTermFormId: true,
				classroomDepartmentId: true,
				studentTermForm: { select: { classroomDepartmentId: true } },
			},
		}),
		db.financePayment.aggregate({
			where: {
				schoolProfileId: schoolId,
				collectedSessionTermId: termId,
				payerType: "STUDENT",
				status: "PAID",
				deletedAt: null,
			},
			_sum: { amount: true },
		}),
		db.financePayment.aggregate({
			where: {
				schoolProfileId: schoolId,
				payerType: "STUDENT",
				status: "PAID",
				deletedAt: null,
				paymentDate: { gte: dayStart },
			},
			_sum: { amount: true },
		}),
		db.financePayment.findMany({
			where: {
				schoolProfileId: schoolId,
				payerType: "STUDENT",
				status: "PAID",
				deletedAt: null,
			},
			select: {
				id: true,
				amount: true,
				paymentDate: true,
				method: true,
				student: {
					select: { id: true, name: true, surname: true, otherName: true },
				},
			},
			orderBy: { paymentDate: "desc" },
			take: 6,
		}),
		db.studentTermForm.count({
			where: { ...activeTermForm, registrationReviewStatus: "PENDING" },
		}),
		db.studentTermForm.count({
			where: { ...activeTermForm, admissionType: "UNCLASSIFIED" },
		}),
		db.enrollmentApplication.count({
			where: {
				schoolProfileId: schoolId,
				deletedAt: null,
				status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
			},
		}),
	]);

	const rosterByDepartment = new Map(
		rosterCounts.map((row) => [row.classroomDepartmentId, row._count._all]),
	);

	// Latest whole-class register per department for today.
	const registerByDepartment = new Map<
		string,
		{ present: number; marked: number; takenAt: Date | null }
	>();
	for (const register of registers) {
		if (!register.departmentId || registerByDepartment.has(register.departmentId))
			continue;
		const present = register.studentAttendanceList.filter((row) =>
			row.status ? PRESENT_STATUSES.has(row.status) : Boolean(row.isPresent),
		).length;
		registerByDepartment.set(register.departmentId, {
			present,
			marked: register.studentAttendanceList.length,
			takenAt: register.createdAt ?? null,
		});
	}

	const feesByDepartment = new Map<string, { charged: number; paid: number }>();
	const debtors = new Set<string>();
	let charged = 0;
	let paid = 0;
	for (const charge of charges) {
		const amount = toNumber(charge.amount);
		const amountPaid = Math.min(toNumber(charge.amountPaid), amount);
		charged += amount;
		paid += amountPaid;
		if (amount - amountPaid > 0 && charge.studentTermFormId) {
			debtors.add(charge.studentTermFormId);
		}
		const departmentId =
			charge.classroomDepartmentId ?? charge.studentTermForm?.classroomDepartmentId;
		if (!departmentId) continue;
		const bucket = feesByDepartment.get(departmentId) ?? { charged: 0, paid: 0 };
		bucket.charged += amount;
		bucket.paid += amountPaid;
		feesByDepartment.set(departmentId, bucket);
	}

	const classes = departments.map((department) => {
		const register = registerByDepartment.get(department.id) ?? null;
		const fees = feesByDepartment.get(department.id);
		return {
			id: department.id,
			className: department.classRoom?.name ?? null,
			departmentName: department.departmentName,
			students: rosterByDepartment.get(department.id) ?? 0,
			register,
			feesPaidRatio: fees && fees.charged > 0 ? fees.paid / fees.charged : null,
		};
	});

	const recorded = classes.filter((row) => row.register);
	const presentToday = recorded.reduce(
		(sum, row) => sum + (row.register?.present ?? 0),
		0,
	);
	const markedToday = recorded.reduce(
		(sum, row) => sum + (row.register?.marked ?? 0),
		0,
	);

	return {
		dayKey,
		term: term
			? {
					title: term.title,
					sessionTitle: term.session?.title ?? null,
					startDate: term.startDate,
					endDate: term.endDate,
				}
			: null,
		students: rosterCounts.reduce((sum, row) => sum + row._count._all, 0),
		attendance: {
			present: presentToday,
			marked: markedToday,
			classesRecorded: recorded.length,
			classesTotal: classes.filter((row) => row.students > 0).length,
		},
		fees: {
			charged,
			paid,
			outstanding: Math.max(charged - paid, 0),
			debtors: debtors.size,
			collected: toNumber(collected._sum.amount),
			collectedToday: toNumber(collectedToday._sum.amount),
		},
		openItems: {
			pendingRegistrations,
			pendingApplications,
			unclassified,
			missingRegisters: classes.filter((row) => row.students > 0 && !row.register)
				.length,
		},
		classes,
		recentPayments: recentPayments.map((payment) => ({
			id: payment.id,
			amount: toNumber(payment.amount),
			paymentDate: payment.paymentDate,
			method: payment.method,
			student: payment.student,
		})),
	};
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;

/** Week position of `now` inside a term, for the term track. */
export function termWeekProgress(
	term: { startDate: Date | null; endDate: Date | null } | null,
	now: Date,
) {
	if (!term?.startDate || !term.endDate) return null;
	const week = 7 * 24 * 60 * 60 * 1000;
	const totalWeeks = Math.max(
		1,
		Math.ceil((term.endDate.getTime() - term.startDate.getTime() + 1) / week),
	);
	const elapsed = now.getTime() - term.startDate.getTime();
	const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor(elapsed / week) + 1));
	const daysLeft = Math.max(
		0,
		Math.ceil((term.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
	);
	return { currentWeek, totalWeeks, daysLeft };
}
