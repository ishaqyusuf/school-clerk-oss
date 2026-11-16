import {
	parseAccountActionCard,
	assistantToolInfo,
	collectionsQuery,
	correctionDraft,
	moneyDraftToolNames,
	registrationDraft,
	salaryDraft,
	studentPaymentDraft,
	transferDraft,
} from "@school-clerk/ai/contracts";
import { Prisma } from "@school-clerk/db";
import { jsonValue, requestFingerprint } from "@school-clerk/db/assistant";
import { classroomDisplayName } from "@school-clerk/utils";
import { formatStudentName } from "@school-clerk/utils/student-name";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { requireFinanceReadAccess } from "../db/queries/finance";
import type { TRPCContext } from "../trpc/init";
import type { AssistantActor } from "./actor";
import { readPaymentEvidence } from "./payment-evidence";

const matchLimit = 8;

function words(name: string) {
	return name.trim().split(/\s+/).slice(0, 8);
}

async function studentMatches(
	ctx: TRPCContext,
	actor: AssistantActor,
	name: string,
) {
	const students = await ctx.db.students.findMany({
		where: {
			schoolProfileId: actor.schoolId,
			deletedAt: null,
			AND: words(name).map((contains) => ({
				OR: [
					{ name: { contains, mode: "insensitive" } },
					{ surname: { contains, mode: "insensitive" } },
					{ otherName: { contains, mode: "insensitive" } },
				],
			})),
		},
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					schoolProfileId: actor.schoolId,
					sessionTermId: actor.termId ?? "",
					deletedAt: null,
				},
				take: 1,
				orderBy: { id: "asc" },
				select: {
					classroomDepartment: {
						select: {
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
				},
			},
		},
		orderBy: [{ surname: "asc" }, { name: "asc" }, { id: "asc" }],
		take: matchLimit,
	});
	return students.map(({ termForms, ...student }) => {
		const classroom = termForms[0]?.classroomDepartment;
		return {
			id: student.id,
			name: formatStudentName(student, ctx.profile.studentNameFormat),
			detail: classroom
				? classroomDisplayName({
						className: classroom.classRoom?.name,
						departmentName: classroom.departmentName,
					})
				: null,
		};
	});
}

async function exactAccount(ctx: TRPCContext, schoolId: string, name?: string) {
	if (!name) return undefined;
	const matches = await ctx.db.financeStream.findMany({
		where: {
			schoolProfileId: schoolId,
			deletedAt: null,
			name: { equals: name, mode: "insensitive" },
		},
		select: { id: true },
		take: 2,
	});
	return matches.length === 1 ? matches[0]?.id : undefined;
}

async function exactClassroom(
	ctx: TRPCContext,
	actor: AssistantActor,
	name?: string,
) {
	if (!name || !actor.sessionId) return undefined;
	const matches = await ctx.db.classRoomDepartment.findMany({
		where: {
			schoolProfileId: actor.schoolId,
			deletedAt: null,
			classRoom: { schoolSessionId: actor.sessionId, deletedAt: null },
			OR: [
				{ departmentName: { equals: name, mode: "insensitive" } },
				{ classRoom: { name: { equals: name, mode: "insensitive" } } },
			],
		},
		select: { id: true },
		take: 2,
	});
	return matches.length === 1 ? matches[0]?.id : undefined;
}

async function readCollections(
	ctx: TRPCContext,
	actor: AssistantActor,
	input: z.infer<typeof collectionsQuery>,
) {
	requireFinanceReadAccess(ctx);
	const current =
		actor.termId &&
		(input.period === "previous_term" || input.period === "current_term")
			? await ctx.db.sessionTerm.findFirst({
					where: {
						id: actor.termId,
						schoolId: actor.schoolId,
						deletedAt: null,
					},
					select: {
						id: true,
						title: true,
						startDate: true,
						sessionId: true,
						session: { select: { title: true } },
					},
				})
			: null;
	const term =
		input.period === "previous_term" && current?.startDate
			? await ctx.db.sessionTerm.findFirst({
					where: {
						schoolId: actor.schoolId,
						deletedAt: null,
						startDate: { lt: current.startDate },
					},
					orderBy: [{ startDate: "desc" }, { id: "asc" }],
					select: {
						id: true,
						title: true,
						sessionId: true,
						session: { select: { title: true } },
					},
				})
			: input.period === "current_term"
				? current
				: null;
	if (
		(input.period === "current_term" || input.period === "previous_term") &&
		!term
	)
		throw new Error("Select the academic term or provide a date range.");

	const today = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Africa/Lagos",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
	const from =
		input.period === "today"
			? today
			: input.period === "date_range"
				? input.from
				: undefined;
	const to =
		input.period === "today"
			? today
			: input.period === "date_range"
				? input.to
				: undefined;
	if (input.period === "date_range" && (!from || !to || from > to))
		throw new Error("Enter a valid start and end date.");
	const startDate = from ? new Date(`${from}T00:00:00+01:00`) : undefined;
	const endDate = to ? new Date(`${to}T00:00:00+01:00`) : undefined;
	if (endDate) endDate.setUTCDate(endDate.getUTCDate() + 1);
	if (
		startDate &&
		endDate &&
		endDate.getTime() - startDate.getTime() > 366 * 86400000
	)
		throw new Error("Choose a date range of one year or less.");

	const where = {
		schoolProfileId: actor.schoolId,
		deletedAt: null,
		status: "PAID" as const,
		...(term
			? {
					collectedSessionTermId: term.id,
					collectedSchoolSessionId: term.sessionId,
				}
			: {}),
		...(startDate && endDate
			? { paymentDate: { gte: startDate, lt: endDate } }
			: {}),
	};
	const [totals, feeTotals] = await Promise.all([
		ctx.db.financePayment.groupBy({
			by: ["payerType"],
			where,
			_sum: { amount: true },
			_count: { _all: true },
		}),
		ctx.db.$queryRaw<{ title: string; total: Prisma.Decimal }[]>(
			Prisma.sql`SELECT c.title, SUM(a.amount) AS total
				FROM "FinancePayment" p
				JOIN "FinancePaymentAllocation" a ON a."paymentId" = p.id
				JOIN "FinanceCharge" c ON c.id = a."chargeId" AND c."schoolProfileId" = p."schoolProfileId"
				WHERE p."schoolProfileId" = ${actor.schoolId} AND p."payerType" = 'STUDENT'
					AND p.status = 'PAID' AND p."deletedAt" IS NULL AND a."deletedAt" IS NULL
					${term ? Prisma.sql`AND p."collectedSessionTermId" = ${term.id} AND p."collectedSchoolSessionId" = ${term.sessionId}` : Prisma.empty}
					${startDate && endDate ? Prisma.sql`AND p."paymentDate" >= ${startDate} AND p."paymentDate" < ${endDate}` : Prisma.empty}
				GROUP BY c.title
				ORDER BY total DESC, c.title ASC LIMIT 12`,
		),
	]);
	const student = totals.find((total) => total.payerType === "STUDENT");
	const salaries = totals.find((total) => total.payerType === "STAFF");
	const expenses = totals.find((total) => total.payerType === "SCHOOL");
	return {
		period: term
			? [term.session?.title, term.title].filter(Boolean).join(" · ")
			: from === to
				? from
				: `${from} to ${to}`,
		collected: Number(student?._sum.amount ?? 0),
		studentPaymentEntries: student?._count._all ?? 0,
		salariesPaid: Number(salaries?._sum.amount ?? 0),
		expensesPaid: Number(expenses?._sum.amount ?? 0),
		collectionsByFee: feeTotals.map((fee) => ({
			fee: fee.title,
			collected: Number(fee.total),
		})),
	};
}

export function buildAccountTools(
	ctx: TRPCContext,
	actor: AssistantActor,
	conversationId: string,
	runId: string,
	assertAccess: (name: string) => Promise<void>,
	attachmentIds: readonly string[],
): ToolSet {
	async function output(name: string, data: unknown) {
		const info = assistantToolInfo(name);
		return {
			status: "success",
			toolId: name,
			toolVersion: 1,
			data,
			observedAt: new Date().toISOString(),
			sources: info ? [{ label: info.title, href: info.href }] : [],
			invalidationTags: [],
		};
	}
	async function draft(value: unknown, name: string) {
		const card = parseAccountActionCard(value);
		if (!card) throw new Error("Check the draft details before continuing.");
		if (!(card.action in moneyDraftToolNames)) return output(name, { card });
		const draftId = requestFingerprint({ runId, name, card });
		const row = await ctx.db.assistantActionProposal.upsert({
			where: { id: draftId },
			update: {},
			create: {
				id: draftId,
				schoolProfileId: actor.schoolId,
				userId: actor.userId,
				conversationId,
				runId,
				toolName: name,
				payload: jsonValue(card),
				summary: assistantToolInfo(name)?.title ?? name,
				token: crypto.randomUUID(),
				revision: "dashboard-account-action-v1",
				sessionId: actor.sessionId,
				termId: actor.termId,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
			select: { id: true, expiresAt: true },
		});
		return output(name, {
			card,
			draftId: row.id,
			expiresAt: row.expiresAt.toISOString(),
		});
	}
	const receipts = new Map<string, ReturnType<typeof readPaymentEvidence>>();
	const studentLookups = new Map<string, ReturnType<typeof studentMatches>>();
	function findStudents(name: string) {
		const lookupKey = words(name)
			.map((word) => word.toLocaleLowerCase())
			.join(" ");
		let lookup = studentLookups.get(lookupKey);
		if (!lookup) {
			lookup = studentMatches(ctx, actor, name);
			studentLookups.set(lookupKey, lookup);
		}
		return lookup;
	}
	const tools = {
		readPaymentEvidence: tool({
			description:
				"Transcribe printed bank-transfer evidence from one attachment in this conversation. Use this first when the user shares a receipt. It does not verify that funds cleared or record a payment.",
			inputSchema: z
				.object({ attachmentId: z.string().min(1).max(191) })
				.strict(),
			execute: async ({ attachmentId }, { abortSignal }) => {
				await assertAccess("readPaymentEvidence");
				if (!attachmentIds.includes(attachmentId))
					return output("readPaymentEvidence", {
						available: false,
						reason: "Choose a receipt attachment from the current chat.",
					});
				let pending = receipts.get(attachmentId);
				if (!pending) {
					if (receipts.size >= 2)
						return output("readPaymentEvidence", {
							available: false,
							reason: "Only two receipts can be read per turn.",
						});
					pending = readPaymentEvidence(
						ctx,
						actor,
						conversationId,
						attachmentId,
						abortSignal,
					);
					receipts.set(attachmentId, pending);
				}
				return output("readPaymentEvidence", await pending);
			},
		}),
		prepareStudentCollection: tool({
			description:
				"Open an editable review for student fee payments, including an admission form, a past-term fee, or one transfer covering several students. Pass each stated student and amount, fee labels, transfer total, receipt date, method, and bank reference when known. If only the total and multiple names are supplied, ask how to split it. This only prepares a draft.",
			inputSchema: studentPaymentDraft,
			execute: async (input) => {
				await assertAccess("prepareStudentCollection");
				const matches = await Promise.all(
					input.students.map((student) => findStudents(student.name)),
				);
				return draft(
					{ action: "student_payment", ...input, matches },
					"prepareStudentCollection",
				);
			},
		}),
		prepareStaffSalary: tool({
			description:
				"Open an editable payment review for an existing staff member when the user gives a teacher/staff name and salary amount. This only prepares a draft.",
			inputSchema: salaryDraft,
			execute: async (input) => {
				await assertAccess("prepareStaffSalary");
				const staff = await ctx.db.staffProfile.findMany({
					where: {
						schoolProfileId: actor.schoolId,
						deletedAt: null,
						AND: words(input.name).map((contains) => ({
							name: { contains, mode: "insensitive" },
						})),
					},
					orderBy: [{ name: "asc" }, { id: "asc" }],
					take: matchLimit,
					select: { id: true, name: true, title: true },
				});
				return draft(
					{
						action: "staff_payment",
						...input,
						matches: staff.map((row) => ({
							id: row.id,
							name: row.name,
							detail: row.title,
						})),
					},
					"prepareStaffSalary",
				);
			},
		}),
		prepareAccountTransfer: tool({
			description:
				"Open an editable bookkeeping transfer form for two existing school accounts. Allow the user to pick unspecified accounts. No bank transfer is sent.",
			inputSchema: transferDraft,
			execute: async (input) => {
				await assertAccess("prepareAccountTransfer");
				const [fromId, toId] = await Promise.all([
					exactAccount(ctx, actor.schoolId, input.from),
					exactAccount(ctx, actor.schoolId, input.to),
				]);
				return draft(
					{ action: "transfer", ...input, fromId, toId },
					"prepareAccountTransfer",
				);
			},
		}),
		prepareStudentRegistration: tool({
			description:
				"Open the existing student registration form for a new student. Pass givenName and surname only when the user made the distinction clear. Prefill the stated name, classroom if given, and the amount and label of every stated fee, e.g. admission form and school fees. The user reviews the registration and picks missing fields. Use this when the user is explicitly registering a student, or asks to enroll a new student and pay fees.",
			inputSchema: registrationDraft,
			execute: async (input) => {
				await assertAccess("prepareStudentRegistration");
				if (input.fees.length) await assertAccess("prepareStudentCollection");
				return draft(
					{
						action: "register_student",
						...input,
						classroomId: await exactClassroom(ctx, actor, input.classroom),
					},
					"prepareStudentRegistration",
				);
			},
		}),
		prepareStudentCorrection: tool({
			description:
				"Open existing student information for a name correction. Use the original name for lookup and only include corrected name fields the user specified. A name correction never creates a second payment.",
			inputSchema: correctionDraft,
			execute: async (input) => {
				await assertAccess("prepareStudentCorrection");
				return draft(
					{
						action: "correct_student",
						...input,
						matches: await findStudents(input.name),
					},
					"prepareStudentCorrection",
				);
			},
		}),
		readSchoolCollections: tool({
			description:
				"Read recorded collections and spending for today, the selected term, the previous term, or an explicit date range. Always use this tool for totals; chat history is not the ledger.",
			inputSchema: collectionsQuery,
			execute: async (input) => {
				await assertAccess("readSchoolCollections");
				return output(
					"readSchoolCollections",
					await readCollections(ctx, actor, input),
				);
			},
		}),
	} satisfies ToolSet;
	return Object.fromEntries(
		Object.entries(tools).filter(
			([name]) =>
				actor.availableTools.includes(name) &&
				(name !== "readPaymentEvidence" || attachmentIds.length > 0),
		),
	);
}
