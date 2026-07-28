import { createHash } from "node:crypto";
import type { TRPCContext } from "@api/trpc/init";
import type {
	PaymentImportSourceRow,
	StartPaymentImportJobInput,
	VerifyPaymentImportInput,
} from "@api/trpc/schemas/payment-import";
import { Prisma } from "@school-clerk/db";
import {
	type StudentNameFormat,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import { processFinancePaymentImportJobTaskId } from "@school-clerk/utils/task-contracts";
import { tasks } from "@trigger.dev/sdk";
import { TRPCError } from "@trpc/server";
import { requireFinanceWriteAccess } from "./finance";

const PAYMENT_TYPE_TITLES = {
	SCHOOL_FEE: "School Fee",
	ENTRANCE_FORM: "Entrance Form",
	BOOK: "Book",
	UNIFORM: "Uniform",
	WAGE: "Staff Wage",
} as const;

const STREAM_KEYWORDS: Record<
	keyof typeof PAYMENT_TYPE_TITLES,
	readonly string[]
> = {
	SCHOOL_FEE: ["tuition", "school fee", "madrasah", "رسوم"],
	ENTRANCE_FORM: ["entrance", "admission", "form", "registration", "قبول"],
	BOOK: ["book", "books", "كتاب", "كتب"],
	UNIFORM: ["uniform", "school wear", "زي"],
	WAGE: ["salary", "wage", "payroll", "teacher"],
};

type PaymentImportCandidate = {
	id: string;
	name: string;
	detail: string | null;
	score: number;
	studentTermFormId: string | null;
	classroomDepartmentId: string | null;
};

type PaymentImportItem = {
	id: string;
	name: string;
	type: "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";
	streamId: string;
	amount: number;
	collectable: boolean;
	applicableClassroomDepartmentIds: string[];
};

type PersistedPaymentImportRow = PaymentImportSourceRow & {
	counterpartyId: string | null;
	streamId: string | null;
	studentTermFormId?: string | null;
};

type PaymentImportDb = TRPCContext["db"];
type PaymentImportJobRecord = Prisma.FinancePaymentImportJobGetPayload<object>;
type PaymentImportJobRowRecord =
	Prisma.FinancePaymentImportJobRowGetPayload<object>;

function toNumber(value: unknown) {
	return value == null ? 0 : Number(value);
}

function normalizeArabic(value: string) {
	const replacements: Record<string, string> = {
		أ: "ا",
		إ: "ا",
		آ: "ا",
		ٱ: "ا",
		ى: "ي",
		ئ: "ي",
		ؤ: "و",
		ة: "ه",
	};

	return value
		.normalize("NFKC")
		.replace(/[\u064B-\u065F\u0670]/g, "")
		.replace(/[أإآٱىئؤة]/g, (character) => replacements[character] ?? character)
		.replace(/[،,.;:()[\]{}'"`~!@#$%^&*_=+?/\\|-]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function normalizedSortedTokens(value: string) {
	return normalizeArabic(value).split(" ").filter(Boolean).sort().join(" ");
}

function levenshteinDistance(left: string, right: string) {
	if (!left) return right.length;
	if (!right) return left.length;

	const previous = Array.from(
		{ length: right.length + 1 },
		(_, index) => index,
	);

	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		const current = [leftIndex];
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
			current[rightIndex] = Math.min(
				(current[rightIndex - 1] ?? 0) + 1,
				(previous[rightIndex] ?? 0) + 1,
				(previous[rightIndex - 1] ?? 0) +
					(left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
			);
		}
		previous.splice(0, previous.length, ...current);
	}

	return previous[right.length] ?? Math.max(left.length, right.length);
}

function candidateScore(source: string, candidate: string) {
	const normalizedSource = normalizeArabic(source);
	const normalizedCandidate = normalizeArabic(candidate);
	if (!normalizedSource || !normalizedCandidate) return 0;
	if (normalizedSource === normalizedCandidate) return 100;
	if (
		normalizedSortedTokens(normalizedSource) ===
		normalizedSortedTokens(normalizedCandidate)
	) {
		return 100;
	}
	if (
		normalizedSource.includes(normalizedCandidate) ||
		normalizedCandidate.includes(normalizedSource)
	) {
		return 88;
	}

	const distance = levenshteinDistance(normalizedSource, normalizedCandidate);
	return Math.max(
		0,
		Math.round(
			(1 -
				distance /
					Math.max(normalizedSource.length, normalizedCandidate.length)) *
				100,
		),
	);
}

function rankCandidates(
	sourceName: string,
	candidates: Omit<PaymentImportCandidate, "score">[],
) {
	return candidates
		.map((candidate) => ({
			...candidate,
			score: candidateScore(sourceName, candidate.name),
		}))
		.filter((candidate) => candidate.score >= 55)
		.sort(
			(left, right) =>
				right.score - left.score || left.name.localeCompare(right.name),
		)
		.slice(0, 5);
}

function fingerprintRow(
	mode: string,
	termId: string,
	row: PaymentImportSourceRow,
) {
	return createHash("sha256")
		.update(
			[
				mode,
				termId,
				row.paymentDate ?? "",
				normalizeArabic(row.counterpartyName),
				row.paymentType,
				row.amount.toFixed(2),
				row.sourceNote?.trim() ?? "",
			].join("|"),
		)
		.digest("hex");
}

function importReference(rowId: string) {
	return `payment-import:${rowId}`;
}

function paymentDate(value: string) {
	return new Date(`${value}T12:00:00.000Z`);
}

function assertModePaymentType(
	mode: VerifyPaymentImportInput["mode"],
	row: PaymentImportSourceRow,
) {
	if (mode === "STUDENT" && row.paymentType === "WAGE") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Row ${row.lineNumber}: WAGE is only valid for staff imports.`,
		});
	}
	if (mode === "STAFF" && row.paymentType !== "WAGE") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Row ${row.lineNumber}: staff imports only support WAGE.`,
		});
	}
}

async function resolveImportTerm(ctx: TRPCContext, termId: string) {
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "A school workspace is required.",
		});
	}

	const term = await ctx.db.sessionTerm.findFirst({
		where: {
			id: termId,
			schoolId: schoolProfileId,
			deletedAt: null,
		},
		select: {
			id: true,
			title: true,
			sessionId: true,
			session: { select: { id: true, title: true } },
		},
	});

	if (!term?.session) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "The selected term was not found in this school.",
		});
	}

	return { schoolProfileId, term, session: term.session };
}

function suggestStream(
	streams: Array<{
		id: string;
		name: string;
		accountType: "CREDIT" | "DEBIT";
	}>,
	paymentType: keyof typeof PAYMENT_TYPE_TITLES,
) {
	const expectedAccountType = paymentType === "WAGE" ? "DEBIT" : "CREDIT";
	const eligible = streams.filter(
		(stream) => stream.accountType === expectedAccountType,
	);
	const keywords = STREAM_KEYWORDS[paymentType];
	return (
		eligible.find((stream) => {
			const normalized = normalizeArabic(stream.name);
			return keywords.some((keyword) =>
				normalized.includes(normalizeArabic(keyword)),
			);
		}) ?? null
	);
}

function suggestItem(
	items: PaymentImportItem[],
	paymentType: keyof typeof PAYMENT_TYPE_TITLES,
	streamId: string | null,
) {
	if (!streamId) return null;
	const expectedType = {
		SCHOOL_FEE: "TUITION_FEE",
		ENTRANCE_FORM: "OTHER",
		BOOK: "BOOK",
		UNIFORM: "OTHER",
		WAGE: "SALARY",
	} as const;
	const eligible = items.filter(
		(item) =>
			item.streamId === streamId && item.type === expectedType[paymentType],
	);
	const keywords = STREAM_KEYWORDS[paymentType];
	return (
		eligible.find((item) => {
			const normalized = normalizeArabic(item.name);
			return keywords.some((keyword) =>
				normalized.includes(normalizeArabic(keyword)),
			);
		}) ?? (eligible.length === 1 ? eligible[0] : null)
	);
}

export async function verifyPaymentImport(
	ctx: TRPCContext,
	input: VerifyPaymentImportInput,
) {
	requireFinanceWriteAccess(ctx);
	const { schoolProfileId, term, session } = await resolveImportTerm(
		ctx,
		input.termId,
	);
	for (const row of input.rows) assertModePaymentType(input.mode, row);

	const [streams, rawItems] = await Promise.all([
		ctx.db.financeStream.findMany({
			where: { schoolProfileId, deletedAt: null },
			select: { id: true, name: true, accountType: true },
			orderBy: [{ accountType: "asc" }, { name: "asc" }],
		}),
		ctx.db.financeItem.findMany({
			where: {
				schoolProfileId,
				isActive: true,
				deletedAt: null,
				OR: [
					{ schoolSessionId: null, sessionTermId: null },
					{ schoolSessionId: session.id, sessionTermId: null },
					{ sessionTermId: term.id },
				],
			},
			select: {
				id: true,
				name: true,
				type: true,
				streamId: true,
				amount: true,
				collectable: true,
				applicableClasses: {
					where: { deletedAt: null },
					select: { classRoomDepartmentId: true },
				},
			},
			orderBy: { name: "asc" },
		}),
	]);
	const items: PaymentImportItem[] = rawItems.map((item) => ({
		id: item.id,
		name: item.name,
		type: item.type,
		streamId: item.streamId,
		amount: toNumber(item.amount),
		collectable: item.collectable,
		applicableClassroomDepartmentIds: item.applicableClasses.map(
			(applicability) => applicability.classRoomDepartmentId,
		),
	}));

	const counterparties: Omit<PaymentImportCandidate, "score">[] =
		input.mode === "STUDENT"
			? (
					await ctx.db.students.findMany({
						where: { schoolProfileId, deletedAt: null },
						select: {
							id: true,
							name: true,
							surname: true,
							otherName: true,
							termForms: {
								where: {
									schoolProfileId,
									schoolSessionId: session.id,
									sessionTermId: term.id,
									deletedAt: null,
								},
								take: 1,
								select: {
									id: true,
									classroomDepartmentId: true,
									classroomDepartment: {
										select: {
											departmentName: true,
											classRoom: { select: { name: true } },
										},
									},
								},
							},
						},
						orderBy: [{ surname: "asc" }, { name: "asc" }],
					})
				).map((student) => {
					const termForm = student.termForms[0] ?? null;
					return {
						id: student.id,
						name: formatStudentName(
							student,
							ctx.profile.studentNameFormat as StudentNameFormat,
						),
						detail: termForm?.classroomDepartment
							? [
									termForm.classroomDepartment.classRoom?.name,
									termForm.classroomDepartment.departmentName,
								]
									.filter(Boolean)
									.join(" ")
							: "No term sheet in selected term",
						studentTermFormId: termForm?.id ?? null,
						classroomDepartmentId: termForm?.classroomDepartmentId ?? null,
					};
				})
			: (
					await ctx.db.staffProfile.findMany({
						where: { schoolProfileId, deletedAt: null },
						select: { id: true, name: true, title: true },
						orderBy: { name: "asc" },
					})
				).map((staff) => ({
					id: staff.id,
					name: staff.name,
					detail: staff.title ?? "Staff",
					studentTermFormId: null,
					classroomDepartmentId: null,
				}));

	const counterpartyById = new Map(
		counterparties.map((counterparty) => [counterparty.id, counterparty]),
	);
	const streamById = new Map(streams.map((stream) => [stream.id, stream]));
	const itemById = new Map(items.map((item) => [item.id, item]));
	const fingerprintByLine = new Map(
		input.rows.map((row) => [
			row.lineNumber,
			fingerprintRow(input.mode, input.termId, row),
		]),
	);
	const fingerprintCounts = new Map<string, number>();
	for (const row of input.rows) {
		if (row.skip) continue;
		const fingerprint = fingerprintByLine.get(row.lineNumber);
		if (!fingerprint) continue;
		fingerprintCounts.set(
			fingerprint,
			(fingerprintCounts.get(fingerprint) ?? 0) + 1,
		);
	}
	const importedFingerprints = await ctx.db.financePaymentImportJobRow.findMany(
		{
			where: {
				fingerprint: { in: Array.from(fingerprintCounts.keys()) },
				status: "IMPORTED",
				deletedAt: null,
				job: {
					schoolProfileId,
					sessionTermId: term.id,
					mode: input.mode,
					deletedAt: null,
				},
			},
			select: { fingerprint: true },
		},
	);
	const existingFingerprintSet = new Set(
		importedFingerprints.map((row) => row.fingerprint),
	);

	const rows = input.rows.map((row) => {
		const candidates = rankCandidates(row.counterpartyName, counterparties);
		const exactCandidates = candidates.filter(
			(candidate) => candidate.score === 100,
		);
		const selectedCounterparty =
			(row.counterpartyId
				? counterpartyById.get(row.counterpartyId)
				: exactCandidates.length === 1
					? exactCandidates[0]
					: null) ?? null;
		const suggestedStream = suggestStream(streams, row.paymentType);
		const selectedStream =
			(row.streamId ? streamById.get(row.streamId) : suggestedStream) ?? null;
		const applicableItems = items.filter(
			(item) =>
				input.mode === "STAFF" ||
				(item.collectable &&
					(item.applicableClassroomDepartmentIds.length === 0 ||
						Boolean(
							selectedCounterparty?.classroomDepartmentId &&
								item.applicableClassroomDepartmentIds.includes(
									selectedCounterparty.classroomDepartmentId,
								),
						))),
		);
		const suggestedItem = suggestItem(
			applicableItems,
			row.paymentType,
			selectedStream?.id ?? null,
		);
		const selectedItem =
			(row.itemId ? itemById.get(row.itemId) : suggestedItem) ?? null;
		const expectedAccountType = row.paymentType === "WAGE" ? "DEBIT" : "CREDIT";
		const blockers: string[] = [];
		const fingerprint =
			fingerprintByLine.get(row.lineNumber) ??
			fingerprintRow(input.mode, input.termId, row);
		const duplicate =
			(fingerprintCounts.get(fingerprint) ?? 0) > 1 ||
			existingFingerprintSet.has(fingerprint);

		if (!row.skip && !row.paymentDate)
			blockers.push("Payment date is required.");
		if (!row.skip && !selectedCounterparty) {
			blockers.push(
				exactCandidates.length > 1
					? "Multiple exact name matches require review."
					: "Select a matching person.",
			);
		}
		if (
			!row.skip &&
			input.mode === "STUDENT" &&
			selectedCounterparty &&
			!selectedCounterparty.studentTermFormId
		) {
			blockers.push("Student has no term sheet in the selected term.");
		}
		if (!row.skip && !selectedStream)
			blockers.push("Select a finance account.");
		if (
			!row.skip &&
			selectedStream &&
			selectedStream.accountType !== expectedAccountType
		) {
			blockers.push(
				`${PAYMENT_TYPE_TITLES[row.paymentType]} requires a ${expectedAccountType.toLowerCase()} account.`,
			);
		}
		if (
			!row.skip &&
			row.itemId &&
			(!selectedItem ||
				selectedItem.streamId !== selectedStream?.id ||
				!applicableItems.some((item) => item.id === selectedItem.id))
		) {
			blockers.push(
				"Selected finance item is unavailable for this account and term.",
			);
		}
		if (!row.skip && duplicate && !row.allowDuplicate) {
			blockers.push(
				existingFingerprintSet.has(fingerprint)
					? "A matching payment was already imported. Confirm to import it again."
					: "This file contains an identical payment row. Confirm to import it again.",
			);
		}

		return {
			...row,
			counterpartyId: selectedCounterparty?.id ?? null,
			studentTermFormId: selectedCounterparty?.studentTermFormId ?? null,
			streamId: selectedStream?.id ?? null,
			itemId: selectedItem?.id ?? null,
			candidates,
			blockers,
			duplicate,
			status: row.skip
				? ("SKIPPED" as const)
				: blockers.length
					? ("NEEDS_REVIEW" as const)
					: ("READY" as const),
			fingerprint,
		};
	});

	return {
		context: {
			mode: input.mode,
			termId: term.id,
			termTitle: term.title,
			sessionId: session.id,
			sessionTitle: session.title,
		},
		streams,
		items,
		counterparties,
		rows,
		summary: {
			totalRows: rows.length,
			readyRows: rows.filter((row) => row.status === "READY").length,
			skippedRows: rows.filter((row) => row.status === "SKIPPED").length,
			attentionRows: rows.filter((row) => row.status === "NEEDS_REVIEW").length,
			totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
			readyAmount: rows
				.filter((row) => row.status === "READY")
				.reduce((sum, row) => sum + row.amount, 0),
		},
	};
}

type PaymentImportJobRead = {
	id: string;
	mode: "STUDENT" | "STAFF";
	status: string;
	termId: string;
	sessionId: string;
	method: string | null;
	sourceFileName: string | null;
	totalRows: number;
	processedRows: number;
	importedRows: number;
	skippedRows: number;
	failedRows: number;
	totalAmount: number;
	importedAmount: number;
	errorMessage: string | null;
	triggerRunId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	rows: Array<{
		id: string;
		lineNumber: number;
		status: string;
		payload: unknown;
		chargeId: string | null;
		paymentId: string | null;
		allocationId: string | null;
		ledgerEntryId: string | null;
		counterpartyId: string | null;
		streamId: string | null;
		itemId: string | null;
		reason: string | null;
	}>;
};

function serializePaymentImportJob(
	job: PaymentImportJobRecord,
	rows: PaymentImportJobRowRecord[],
): PaymentImportJobRead {
	return {
		id: job.id,
		mode: job.mode,
		status: job.status,
		termId: job.sessionTermId,
		sessionId: job.schoolSessionId,
		method: job.method ?? null,
		sourceFileName: job.sourceFileName ?? null,
		totalRows: job.totalRows,
		processedRows: job.processedRows,
		importedRows: job.importedRows,
		skippedRows: job.skippedRows,
		failedRows: job.failedRows,
		totalAmount: toNumber(job.totalAmount),
		importedAmount: toNumber(job.importedAmount),
		errorMessage: job.errorMessage ?? null,
		triggerRunId: job.triggerRunId ?? null,
		createdAt: job.createdAt ?? null,
		updatedAt: job.updatedAt ?? null,
		rows: rows.map((row) => ({
			id: row.id,
			lineNumber: row.lineNumber,
			status: row.status,
			payload: row.payload,
			chargeId: row.chargeId ?? null,
			paymentId: row.paymentId ?? null,
			allocationId: row.allocationId ?? null,
			ledgerEntryId: row.ledgerEntryId ?? null,
			counterpartyId: row.counterpartyId ?? null,
			streamId: row.streamId ?? null,
			itemId: row.itemId ?? null,
			reason: row.reason ?? null,
		})),
	};
}

async function summarizePaymentImportJob(
	db: PaymentImportDb,
	job: PaymentImportJobRecord,
) {
	const rows = await db.financePaymentImportJobRow.findMany({
		where: { jobId: job.id, deletedAt: null },
		orderBy: { lineNumber: "asc" },
	});
	const importedRows = rows.filter((row) => row.status === "IMPORTED");
	const failedRows = rows.filter((row) => row.status === "FAILED").length;
	const skippedRows = rows.filter((row) => row.status === "SKIPPED").length;
	const processedRows = rows.filter((row) =>
		["IMPORTED", "FAILED", "SKIPPED"].includes(row.status),
	).length;
	const status =
		processedRows < rows.length
			? "RUNNING"
			: failedRows > 0
				? "COMPLETED_WITH_FAILURES"
				: "COMPLETED";
	const importedAmount = importedRows.reduce(
		(sum, row) =>
			sum + toNumber((row.payload as PersistedPaymentImportRow).amount),
		0,
	);
	const updatedJob = await db.financePaymentImportJob.update({
		where: { id: job.id },
		data: {
			status,
			processedRows,
			importedRows: importedRows.length,
			failedRows,
			skippedRows,
			importedAmount: new Prisma.Decimal(importedAmount),
		},
	});
	return { job: updatedJob, rows };
}

export async function startPaymentImportJob(
	ctx: TRPCContext,
	input: StartPaymentImportJobInput,
	options: { enqueue?: boolean } = {},
) {
	requireFinanceWriteAccess(ctx);
	const { schoolProfileId, term, session } = await resolveImportTerm(
		ctx,
		input.termId,
	);
	for (const row of input.rows) assertModePaymentType(input.mode, row);

	const lineNumbers = new Set<number>();
	for (const row of input.rows) {
		if (lineNumbers.has(row.lineNumber)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Duplicate line number ${row.lineNumber}.`,
			});
		}
		lineNumbers.add(row.lineNumber);
	}

	const verification = await verifyPaymentImport(ctx, {
		mode: input.mode,
		termId: input.termId,
		rows: input.rows,
	});
	const blockedRows = verification.rows.filter(
		(row) => row.status === "NEEDS_REVIEW",
	);
	if (blockedRows.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `${blockedRows.length} payment row(s) still need review.`,
		});
	}

	const verifiedByLine = new Map(
		verification.rows.map((row) => [row.lineNumber, row]),
	);
	const persistedRows: PersistedPaymentImportRow[] = input.rows.map((row) => {
		const verified = verifiedByLine.get(row.lineNumber);
		if (row.skip) {
			return {
				...row,
				counterpartyId: verified?.counterpartyId ?? row.counterpartyId ?? null,
				streamId: verified?.streamId ?? row.streamId ?? null,
				studentTermFormId: verified?.studentTermFormId ?? null,
			};
		}
		if (
			!verified?.counterpartyId ||
			!verified.streamId ||
			(input.mode === "STUDENT" && !verified.studentTermFormId)
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Row ${row.lineNumber} is not ready for import.`,
			});
		}
		return {
			...row,
			counterpartyId: verified.counterpartyId,
			streamId: verified.streamId,
			itemId: verified.itemId,
			studentTermFormId: verified.studentTermFormId,
		};
	});
	const executableRows = persistedRows.filter((row) => !row.skip);
	if (!executableRows.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Select at least one payment row to import.",
		});
	}

	const job = await ctx.db.financePaymentImportJob.create({
		data: {
			schoolProfileId,
			schoolSessionId: session.id,
			sessionTermId: term.id,
			createdByUserId: ctx.currentUser?.id ?? null,
			mode: input.mode,
			method: input.method?.trim() || null,
			sourceFileName: input.sourceFileName?.trim() || null,
			totalRows: persistedRows.length,
			totalAmount: new Prisma.Decimal(
				executableRows.reduce((sum, row) => sum + row.amount, 0),
			),
		},
	});

	await ctx.db.financePaymentImportJobRow.createMany({
		data: persistedRows.map((row) => ({
			jobId: job.id,
			lineNumber: row.lineNumber,
			status: row.skip ? "SKIPPED" : "PENDING",
			payload: row,
			fingerprint: fingerprintRow(input.mode, term.id, row),
			counterpartyId: row.counterpartyId,
			studentTermFormId: row.studentTermFormId ?? null,
			streamId: row.streamId,
			itemId: row.itemId ?? null,
			completedAt: row.skip ? new Date() : null,
		})),
	});

	await ctx.db.activity.create({
		data: {
			schoolProfileId,
			userId: ctx.currentUser?.id ?? "system",
			author: ctx.currentUser?.name ?? "System",
			source: "user",
			type: "finance_payment_import_created",
			title: "Payment import created",
			description: `${persistedRows.length} ${input.mode.toLowerCase()} payment rows queued.`,
			meta: {
				jobId: job.id,
				termId: term.id,
				totalRows: persistedRows.length,
				executableRows: executableRows.length,
				skippedRows: persistedRows.length - executableRows.length,
				duplicateOverrides: executableRows.filter((row) => row.allowDuplicate)
					.length,
			},
		},
	});

	if (options.enqueue !== false) {
		try {
			const run = await tasks.trigger(processFinancePaymentImportJobTaskId, {
				jobId: job.id,
			});
			if (run?.id) {
				await ctx.db.financePaymentImportJob.update({
					where: { id: job.id },
					data: { triggerRunId: run.id },
				});
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Import worker queue failed.";
			await ctx.db.financePaymentImportJob.update({
				where: { id: job.id },
				data: { status: "FAILED", errorMessage: message },
			});
			throw error;
		}
	}

	return getPaymentImportJob(ctx, { jobId: job.id });
}

export async function getPaymentImportJob(
	ctx: TRPCContext,
	input: { jobId?: string } = {},
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "A school workspace is required.",
		});
	}

	const job = await ctx.db.financePaymentImportJob.findFirst({
		where: {
			...(input.jobId ? { id: input.jobId } : {}),
			schoolProfileId,
			deletedAt: null,
			...(!input.jobId && ctx.currentUser?.id
				? { createdByUserId: ctx.currentUser.id }
				: {}),
			...(!input.jobId
				? {
						status: {
							in: ["PENDING", "RUNNING", "COMPLETED_WITH_FAILURES", "FAILED"],
						},
					}
				: {}),
		},
		orderBy: { createdAt: "desc" },
	});
	if (!job) {
		if (!input.jobId) return null;
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Payment import job was not found.",
		});
	}

	const rows = await ctx.db.financePaymentImportJobRow.findMany({
		where: { jobId: job.id, deletedAt: null },
		orderBy: { lineNumber: "asc" },
	});
	return serializePaymentImportJob(job, rows);
}

async function executePaymentImportRow(
	db: PaymentImportDb,
	job: PaymentImportJobRecord,
	jobRow: PaymentImportJobRowRecord,
) {
	const payload = jobRow.payload as PersistedPaymentImportRow;
	const reference = importReference(jobRow.id);
	if (!payload.paymentDate) throw new Error("Payment date is required.");
	if (!payload.counterpartyId) throw new Error("Matched person is required.");
	if (!payload.streamId) throw new Error("Finance account is required.");
	const occurredAt = paymentDate(payload.paymentDate);
	const counterpartyId = payload.counterpartyId;
	const streamId = payload.streamId;

	return db.$transaction(async (tx) => {
		await tx.$queryRaw(
			Prisma.sql`SELECT "id" FROM "FinancePaymentImportJobRow" WHERE "id" = ${jobRow.id} FOR UPDATE`,
		);
		const existingPayment = await tx.financePayment.findFirst({
			where: {
				schoolProfileId: job.schoolProfileId,
				reference,
				deletedAt: null,
			},
			include: {
				allocations: { where: { deletedAt: null }, take: 1 },
				ledgerEntries: { where: { deletedAt: null }, take: 1 },
			},
		});
		if (existingPayment) {
			return {
				chargeId: existingPayment.allocations[0]?.chargeId ?? null,
				paymentId: existingPayment.id,
				allocationId: existingPayment.allocations[0]?.id ?? null,
				ledgerEntryId: existingPayment.ledgerEntries[0]?.id ?? null,
			};
		}

		const closedLedger = await tx.financeTermLedgerClose.findFirst({
			where: {
				schoolProfileId: job.schoolProfileId,
				sessionTermId: job.sessionTermId,
				status: "CLOSED",
				deletedAt: null,
			},
			select: { id: true },
		});
		if (closedLedger) throw new Error("The selected term ledger is closed.");
		const stream = await tx.financeStream.findFirst({
			where: {
				id: streamId,
				schoolProfileId: job.schoolProfileId,
				deletedAt: null,
			},
		});
		if (!stream) throw new Error("Finance account was not found.");
		const expectedAccountType = job.mode === "STAFF" ? "DEBIT" : "CREDIT";
		if (stream.accountType !== expectedAccountType) {
			throw new Error(
				`${job.mode === "STAFF" ? "Staff wages" : "Student payments"} require a ${expectedAccountType.toLowerCase()} account.`,
			);
		}
		let studentId: string | null = null;
		let studentTermFormId: string | null = null;
		let staffProfileId: string | null = null;
		let classroomDepartmentId: string | null = null;

		if (job.mode === "STUDENT") {
			if (!payload.studentTermFormId) {
				throw new Error(
					"Student term sheet was not selected for this payment.",
				);
			}
			const termForm = await tx.studentTermForm.findFirst({
				where: {
					id: payload.studentTermFormId,
					studentId: counterpartyId,
					schoolProfileId: job.schoolProfileId,
					schoolSessionId: job.schoolSessionId,
					sessionTermId: job.sessionTermId,
					deletedAt: null,
				},
			});
			if (!termForm) {
				throw new Error(
					"Student term sheet was not found in the selected term.",
				);
			}
			studentId = counterpartyId;
			studentTermFormId = termForm.id;
			classroomDepartmentId = termForm.classroomDepartmentId;
		} else {
			const staff = await tx.staffProfile.findFirst({
				where: {
					id: counterpartyId,
					schoolProfileId: job.schoolProfileId,
					deletedAt: null,
				},
				select: { id: true },
			});
			if (!staff) throw new Error("Staff profile was not found.");
			staffProfileId = staff.id;
		}

		const amount = new Prisma.Decimal(payload.amount);
		const title = PAYMENT_TYPE_TITLES[payload.paymentType];
		const note = [
			payload.sourceNote?.trim() || null,
			`Imported from payment row ${jobRow.lineNumber}.`,
		]
			.filter(Boolean)
			.join(" ");
		const selectedItem = payload.itemId
			? await tx.financeItem.findFirst({
					where: {
						id: payload.itemId,
						schoolProfileId: job.schoolProfileId,
						streamId: stream.id,
						isActive: true,
						deletedAt: null,
						OR: [
							{ schoolSessionId: null, sessionTermId: null },
							{
								schoolSessionId: job.schoolSessionId,
								sessionTermId: null,
							},
							{ sessionTermId: job.sessionTermId },
						],
						...(job.mode === "STUDENT"
							? {
									collectable: true,
									AND: [
										{
											OR: [
												{
													applicableClasses: {
														none: { deletedAt: null },
													},
												},
												...(classroomDepartmentId
													? [
															{
																applicableClasses: {
																	some: {
																		deletedAt: null,
																		classRoomDepartmentId:
																			classroomDepartmentId,
																	},
																},
															},
														]
													: []),
											],
										},
									],
								}
							: {}),
					},
					select: {
						id: true,
						name: true,
						description: true,
						amount: true,
					},
				})
			: null;
		if (payload.itemId && !selectedItem) {
			throw new Error(
				"Finance item was not found for the selected account, term, and person.",
			);
		}

		let chargeId: string;
		const outstandingCharge =
			job.mode === "STUDENT" && selectedItem
				? await tx.financeCharge.findFirst({
						where: {
							schoolProfileId: job.schoolProfileId,
							streamId: stream.id,
							itemId: selectedItem.id,
							studentId,
							studentTermFormId,
							schoolSessionId: job.schoolSessionId,
							sessionTermId: job.sessionTermId,
							status: { in: ["PENDING", "PARTIALLY_PAID"] },
							deletedAt: null,
						},
						orderBy: { createdAt: "asc" },
						select: {
							id: true,
							amount: true,
							amountPaid: true,
							collectionStatus: true,
						},
					})
				: null;

		if (outstandingCharge) {
			const nextAmountPaid = new Prisma.Decimal(
				toNumber(outstandingCharge.amountPaid) + payload.amount,
			);
			const chargeAmount = new Prisma.Decimal(outstandingCharge.amount);
			if (nextAmountPaid.greaterThan(chargeAmount)) {
				throw new Error(
					"Payment amount exceeds the selected outstanding charge.",
				);
			}
			const paid = nextAmountPaid.greaterThanOrEqualTo(chargeAmount);
			await tx.financeCharge.update({
				where: { id: outstandingCharge.id },
				data: {
					amountPaid: nextAmountPaid,
					status: paid ? "PAID" : "PARTIALLY_PAID",
					collectionStatus:
						paid && outstandingCharge.collectionStatus === "NOT_COLLECTED"
							? "COLLECTED"
							: outstandingCharge.collectionStatus,
				},
			});
			chargeId = outstandingCharge.id;
		} else {
			const configuredAmount = job.mode === "STUDENT" && selectedItem
				? toNumber(selectedItem.amount)
				: payload.amount;
			const chargeAmount = new Prisma.Decimal(
				Math.max(configuredAmount, payload.amount),
			);
			const paid = amount.greaterThanOrEqualTo(chargeAmount);
			const charge = await tx.financeCharge.create({
				data: {
					schoolProfileId: job.schoolProfileId,
					streamId: stream.id,
					itemId: selectedItem?.id ?? null,
					payerType: job.mode === "STUDENT" ? "STUDENT" : "STAFF",
					studentId,
					studentTermFormId,
					staffProfileId,
					classroomDepartmentId,
					schoolSessionId: job.schoolSessionId,
					sessionTermId: job.sessionTermId,
					title: selectedItem?.name ?? title,
					description: note || selectedItem?.description,
					amount: chargeAmount,
					amountPaid: amount,
					status: paid ? "PAID" : "PARTIALLY_PAID",
					collectionStatus:
						job.mode === "STUDENT" && selectedItem
							? paid
								? "COLLECTED"
								: "NOT_COLLECTED"
							: "NOT_REQUIRED",
					assignmentSource: "MANUAL",
					createdById: job.createdByUserId,
				},
			});
			chargeId = charge.id;
		}
		const payment = await tx.financePayment.create({
			data: {
				schoolProfileId: job.schoolProfileId,
				streamId: stream.id,
				payerType: job.mode === "STUDENT" ? "STUDENT" : "STAFF",
				studentId,
				staffProfileId,
				collectedSchoolSessionId: job.schoolSessionId,
				collectedSessionTermId: job.sessionTermId,
				amount,
				paymentDate: occurredAt,
				method: job.method,
				reference,
				note,
				receivedById: job.createdByUserId,
			},
		});
		const allocation = await tx.financePaymentAllocation.create({
			data: { paymentId: payment.id, chargeId, amount },
		});
		const ledgerEntry = await tx.financeLedgerEntry.create({
			data: {
				schoolProfileId: job.schoolProfileId,
				streamId: stream.id,
				direction: stream.accountType,
				sourceType: "PAYMENT",
				sourceId: payment.id,
				amount,
				occurredAt: payment.paymentDate,
				note,
				createdById: job.createdByUserId,
				collectedSchoolSessionId: job.schoolSessionId,
				collectedSessionTermId: job.sessionTermId,
				chargeId,
				paymentId: payment.id,
			},
		});

		return {
			chargeId,
			paymentId: payment.id,
			allocationId: allocation.id,
			ledgerEntryId: ledgerEntry.id,
		};
	});
}

export async function processFinancePaymentImportJob(
	db: PaymentImportDb,
	jobId: string,
) {
	const job = await db.financePaymentImportJob.findFirst({
		where: { id: jobId, deletedAt: null },
	});
	if (!job) throw new Error(`Payment import job ${jobId} was not found.`);
	if (
		job.status === "COMPLETED" ||
		job.status === "COMPLETED_WITH_FAILURES" ||
		job.status === "CANCELLED"
	) {
		const rows = await db.financePaymentImportJobRow.findMany({
			where: { jobId: job.id, deletedAt: null },
			orderBy: { lineNumber: "asc" },
		});
		return serializePaymentImportJob(job, rows);
	}

	await db.financePaymentImportJob.update({
		where: { id: job.id },
		data: { status: "RUNNING", errorMessage: null },
	});
	const pendingRows = await db.financePaymentImportJobRow.findMany({
		where: {
			jobId: job.id,
			status: { in: ["PENDING", "RUNNING"] },
			deletedAt: null,
		},
		orderBy: { lineNumber: "asc" },
	});

	for (const row of pendingRows) {
		try {
			await db.financePaymentImportJobRow.update({
				where: { id: row.id },
				data: { status: "RUNNING", reason: null },
			});
			const result = await executePaymentImportRow(db, job, row);
			await db.financePaymentImportJobRow.update({
				where: { id: row.id },
				data: {
					status: "IMPORTED",
					...result,
					completedAt: new Date(),
				},
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : "Unknown error";
			await db.financePaymentImportJobRow.update({
				where: { id: row.id },
				data: {
					status: "FAILED",
					reason,
					completedAt: new Date(),
				},
			});
			await db.activity.create({
				data: {
					schoolProfileId: job.schoolProfileId,
					userId: job.createdByUserId ?? "system",
					author: "System",
					source: "system",
					type: "finance_payment_import_row_failed",
					title: "Payment import row failed",
					description: `Line ${row.lineNumber}: ${reason}`,
					meta: { jobId: job.id, jobRowId: row.id, lineNumber: row.lineNumber },
				},
			});
		}
		await summarizePaymentImportJob(db, job);
	}

	const summary = await summarizePaymentImportJob(db, job);
	if (
		summary.job.status === "COMPLETED" ||
		summary.job.status === "COMPLETED_WITH_FAILURES"
	) {
		await db.activity.create({
			data: {
				schoolProfileId: job.schoolProfileId,
				userId: job.createdByUserId ?? "system",
				author: "System",
				source: "system",
				type: "finance_payment_import_completed",
				title: "Payment import completed",
				description: `${summary.job.importedRows} of ${summary.job.totalRows} payment rows imported.`,
				meta: {
					jobId: job.id,
					importedRows: summary.job.importedRows,
					failedRows: summary.job.failedRows,
				},
			},
		});
	}
	return serializePaymentImportJob(summary.job, summary.rows);
}

export async function retryPaymentImportJob(
	ctx: TRPCContext,
	input: { jobId: string },
	options: { enqueue?: boolean } = {},
) {
	requireFinanceWriteAccess(ctx);
	const schoolProfileId = ctx.profile.schoolId;
	if (!schoolProfileId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "A school workspace is required.",
		});
	}

	const job = await ctx.db.financePaymentImportJob.findFirst({
		where: {
			id: input.jobId,
			schoolProfileId,
			deletedAt: null,
			status: { in: ["FAILED", "COMPLETED_WITH_FAILURES"] },
		},
	});
	if (!job) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "A retryable payment import job was not found.",
		});
	}

	const retryableRows = await ctx.db.financePaymentImportJobRow.findMany({
		where: {
			jobId: job.id,
			status: { in: ["FAILED", "PENDING", "RUNNING"] },
			deletedAt: null,
		},
		select: { id: true, status: true },
	});
	if (!retryableRows.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This payment import has no rows to retry.",
		});
	}
	const failedRowCount = retryableRows.filter(
		(row) => row.status === "FAILED",
	).length;

	await ctx.db.$transaction([
		ctx.db.financePaymentImportJobRow.updateMany({
			where: {
				id: { in: retryableRows.map((row) => row.id) },
				jobId: job.id,
				status: { in: ["FAILED", "PENDING", "RUNNING"] },
			},
			data: {
				status: "PENDING",
				reason: null,
				completedAt: null,
			},
		}),
		ctx.db.financePaymentImportJob.update({
			where: { id: job.id },
			data: {
				status: "PENDING",
				errorMessage: null,
				triggerRunId: null,
				processedRows: Math.max(0, job.processedRows - failedRowCount),
				failedRows: Math.max(0, job.failedRows - failedRowCount),
			},
		}),
		ctx.db.activity.create({
			data: {
				schoolProfileId,
				userId: ctx.currentUser?.id ?? "system",
				author: ctx.currentUser?.name ?? "System",
				source: "user",
				type: "finance_payment_import_retried",
				title: "Payment import retried",
				description: `${retryableRows.length} payment rows queued again.`,
				meta: {
					jobId: job.id,
					retryableRows: retryableRows.length,
					failedRows: failedRowCount,
				},
			},
		}),
	]);

	if (options.enqueue !== false) {
		try {
			const run = await tasks.trigger(processFinancePaymentImportJobTaskId, {
				jobId: job.id,
			});
			if (run?.id) {
				await ctx.db.financePaymentImportJob.update({
					where: { id: job.id },
					data: { triggerRunId: run.id },
				});
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Import worker queue failed.";
			await ctx.db.financePaymentImportJob.update({
				where: { id: job.id },
				data: { status: "FAILED", errorMessage: message },
			});
			throw error;
		}
	}

	return getPaymentImportJob(ctx, { jobId: job.id });
}
