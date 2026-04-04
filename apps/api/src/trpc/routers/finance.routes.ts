import { z } from "@hono/zod-openapi";
import { createTRPCRouter, publicProcedure } from "../init";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const streamFilterSchema = z.object({
	filter: z.enum(["term", "session"]).default("term"),
	termId: z.string().optional().nullable(),
	sessionId: z.string().optional().nullable(),
});

const addFundSchema = z.object({
	walletId: z.string(),
	amount: z.number().positive(),
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	date: z.date().optional().nullable(),
});

const withdrawFundSchema = z.object({
	walletId: z.string(),
	amount: z.number().positive(),
	title: z.string().min(1),
	description: z.string().optional().nullable(),
	date: z.date().optional().nullable(),
});

const payBillSchema = z.object({
	billId: z.string(),
	amount: z.number().positive(),
	date: z.date().optional().nullable(),
});

const receivePaymentLineSchema = z.object({
	source: z.enum(["studentFee", "billable", "manual", "feeHistory"]),
	studentFeeId: z.string().optional().nullable(),
	billableHistoryId: z.string().optional().nullable(),
	feeHistoryId: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	amountDue: z.number().positive(),
	amountToPay: z.number().positive(),
});

const receivePaymentSchema = z.object({
	studentId: z.string(),
	studentTermFormId: z.string(),
	paymentMethod: z.string().min(1),
	paymentDate: z.date().optional().nullable(),
	reference: z.string().optional().nullable(),
	amountReceived: z.number().positive(),
	allocations: z.array(receivePaymentLineSchema).min(1),
});

function getStudentName(student: {
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
}) {
	return [student.name, student.otherName, student.surname]
		.filter(Boolean)
		.join(" ");
}

function getDepartmentName(
	department?: {
		departmentName?: string | null;
		classRoom?: { name?: string | null } | null;
	} | null,
) {
	if (!department) return null;
	if (
		department.departmentName &&
		department.classRoom?.name &&
		department.departmentName.includes(department.classRoom.name)
	) {
		return department.departmentName;
	}
	return [department.classRoom?.name, department.departmentName]
		.filter(Boolean)
		.join(" ");
}

async function getStudentReceivePaymentData(ctx: any, studentId: string) {
	const student = await ctx.db.students.findFirstOrThrow({
		where: {
			id: studentId,
			schoolProfileId: ctx.profile.schoolId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			surname: true,
			otherName: true,
			termForms: {
				where: {
					sessionTermId: ctx.profile.termId,
					deletedAt: null,
				},
				take: 1,
				select: {
					id: true,
					sessionTermId: true,
					schoolSessionId: true,
					classroomDepartmentId: true,
					classroomDepartment: {
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
					sessionTerm: {
						select: {
							id: true,
							title: true,
							session: { select: { title: true } },
						},
					},
					studentFees: {
						where: {
							deletedAt: null,
							status: { not: "cancelled" },
						},
						select: {
							id: true,
							feeTitle: true,
							description: true,
							billAmount: true,
							pendingAmount: true,
							billablePriceId: true,
							feeHistoryId: true,
							createdAt: true,
						},
						orderBy: { createdAt: "asc" },
					},
				},
			},
		},
	});

	const currentTermForm = student.termForms[0] ?? null;
	const latestTermForm = await ctx.db.studentTermForm.findFirst({
		where: {
			studentId,
			deletedAt: null,
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			classroomDepartment: {
				select: {
					departmentName: true,
					classRoom: { select: { name: true } },
				},
			},
			sessionTerm: {
				select: {
					title: true,
					session: { select: { title: true } },
				},
			},
		},
	});

	const billables = await ctx.db.billable.findMany({
		where: {
			schoolProfileId: ctx.profile.schoolId,
			deletedAt: null,
			billableHistory: {
				some: {
					current: true,
					termId: ctx.profile.termId,
					deletedAt: null,
				},
			},
		},
		select: {
			id: true,
			title: true,
			description: true,
			billableHistory: {
				where: {
					current: true,
					termId: ctx.profile.termId,
					deletedAt: null,
				},
				take: 1,
				select: {
					id: true,
					amount: true,
					wallet: { select: { id: true, name: true } },
					classroomDepartments: {
						where: { deletedAt: null },
						select: {
							id: true,
							departmentName: true,
							classRoom: { select: { name: true } },
						},
					},
				},
			},
		},
		orderBy: { title: "asc" },
	});

	const manualBillables = billables
		.map((billable) => {
			const history = billable.billableHistory[0];
			if (!history) return null;
			return {
				billableId: billable.id,
				historyId: history.id,
				title: billable.title,
				description: billable.description,
				amount: history.amount,
				streamId: history.wallet?.id ?? null,
				streamName: history.wallet?.name ?? null,
				classroomDepartments: history.classroomDepartments.map(
					(department) => ({
						id: department.id,
						name: getDepartmentName(department),
					}),
				),
			};
		})
		.filter(
			(
				billable,
			): billable is {
				billableId: string;
				historyId: string;
				title: string;
				description?: string | null;
				amount: number;
				streamId: string | null;
				streamName: string | null;
				classroomDepartments: Array<{ id: string; name: string | null }>;
			} => Boolean(billable),
		);

	// Load current-term FeeHistory records (student-side fees)
	const allFeeHistories = await ctx.db.feeHistory.findMany({
		where: {
			termId: ctx.profile.termId,
			current: true,
			deletedAt: null,
			fee: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
		},
		select: {
			id: true,
			amount: true,
			fee: { select: { title: true, description: true } },
			wallet: { select: { id: true, name: true } },
			classroomDepartments: {
				where: { deletedAt: null },
				select: { id: true },
			},
		},
	});

	if (!currentTermForm) {
		return {
			student: {
				id: student.id,
				name: getStudentName(student),
				currentClassroom: getDepartmentName(
					latestTermForm?.classroomDepartment,
				),
				currentTerm:
					latestTermForm?.sessionTerm?.title &&
					latestTermForm?.sessionTerm?.session?.title
						? `${latestTermForm.sessionTerm.title} • ${latestTermForm.sessionTerm.session.title}`
						: null,
			},
			currentTermForm: null,
			alert: {
				variant: "destructive" as const,
				title: "No current term sheet",
				description:
					"This student does not have a term sheet for the active term yet, so payments cannot be recorded here.",
			},
			summary: {
				totalDue: 0,
				totalPaid: 0,
				totalPending: 0,
			},
			billables: [],
			otherCharges: [],
			manualBillables,
			manualFeeHistories: [],
		};
	}

	const applicableBillables = manualBillables.filter((billable) => {
		if (!billable.classroomDepartments.length) return true;
		return billable.classroomDepartments.some(
			(department) => department.id === currentTermForm.classroomDepartmentId,
		);
	});

	// Build manualFeeHistories: applicable fee histories not yet applied to this student
	const applicableFeeHistories = allFeeHistories.filter((fh) => {
		if (!fh.classroomDepartments.length) return true;
		return fh.classroomDepartments.some(
			(d) => d.id === currentTermForm.classroomDepartmentId,
		);
	});
	const appliedFeeHistoryIds = new Set(
		currentTermForm.studentFees
			.map((sf) => sf.feeHistoryId)
			.filter((id): id is string => Boolean(id)),
	);
	const manualFeeHistories = applicableFeeHistories
		.filter((fh) => !appliedFeeHistoryIds.has(fh.id))
		.map((fh) => ({
			feeHistoryId: fh.id,
			title: fh.fee.title,
			description: fh.fee.description,
			amount: fh.amount,
			streamId: fh.wallet?.id ?? null,
			streamName: fh.wallet?.name ?? null,
		}));

	const feesByBillableHistoryId = new Map<
		string,
		(typeof currentTermForm.studentFees)[number]
	>(
		currentTermForm.studentFees
			.filter(
				(
					fee,
				): fee is (typeof currentTermForm.studentFees)[number] & {
					billablePriceId: string;
				} => Boolean(fee.billablePriceId),
			)
			.map((fee) => [fee.billablePriceId, fee]),
	);

	const billableItems = applicableBillables.map((billable) => {
		const appliedFee = feesByBillableHistoryId.get(billable.historyId);
		const billAmount = appliedFee?.billAmount ?? billable.amount;
		const pendingAmount = appliedFee?.pendingAmount ?? billable.amount;
		const paidAmount = Math.max(billAmount - pendingAmount, 0);
		const status = !appliedFee
			? "UNAPPLIED"
			: pendingAmount <= 0
				? "PAID"
				: pendingAmount < billAmount
					? "PARTIAL"
					: "PENDING";

		return {
			key: billable.historyId,
			source: appliedFee ? "studentFee" : "billable",
			studentFeeId: appliedFee?.id ?? null,
			billableHistoryId: billable.historyId,
			title: billable.title,
			description: billable.description,
			amount: billAmount,
			paidAmount,
			pendingAmount,
			status,
			streamName: billable.streamName,
			classroomNames: billable.classroomDepartments.map(
				(department) => department.name,
			),
		};
	});

	const otherCharges = currentTermForm.studentFees
		.filter((fee) => !fee.billablePriceId && !fee.feeHistoryId)
		.map((fee) => {
			const paidAmount = Math.max(
				(fee.billAmount ?? 0) - (fee.pendingAmount ?? 0),
				0,
			);
			const status =
				fee.pendingAmount <= 0
					? "PAID"
					: fee.pendingAmount < fee.billAmount
						? "PARTIAL"
						: "PENDING";

			return {
				key: fee.id,
				source: "studentFee" as const,
				studentFeeId: fee.id,
				billableHistoryId: null,
				title: fee.feeTitle || "Charge",
				description: fee.description,
				amount: fee.billAmount,
				paidAmount,
				pendingAmount: fee.pendingAmount,
				status,
				streamName: null,
				classroomNames: [],
			};
		});

	// FeeHistory-linked StudentFee records (applied via applyFeeToClass)
	const feeItems = currentTermForm.studentFees
		.filter(
			(
				fee,
			): fee is (typeof currentTermForm.studentFees)[number] & {
				feeHistoryId: string;
			} => Boolean(fee.feeHistoryId),
		)
		.map((fee) => {
			const paidAmount = Math.max(
				(fee.billAmount ?? 0) - (fee.pendingAmount ?? 0),
				0,
			);
			const status: "PAID" | "PARTIAL" | "PENDING" =
				(fee.pendingAmount ?? 0) <= 0
					? "PAID"
					: (fee.pendingAmount ?? 0) < (fee.billAmount ?? 0)
						? "PARTIAL"
						: "PENDING";
			return {
				key: fee.id,
				studentFeeId: fee.id,
				feeHistoryId: fee.feeHistoryId,
				title: fee.feeTitle || "Fee",
				description: fee.description,
				amount: fee.billAmount ?? 0,
				paidAmount,
				pendingAmount: fee.pendingAmount ?? 0,
				status,
			};
		});

	const totalBillableAmount = billableItems.reduce(
		(sum, item) => sum + item.amount,
		0,
	);
	const totalBillablePending = billableItems.reduce(
		(sum, item) => sum + item.pendingAmount,
		0,
	);
	const totalOtherPending = otherCharges.reduce(
		(sum, item) => sum + item.pendingAmount,
		0,
	);
	const totalFeeItemsPending = feeItems.reduce(
		(sum, item) => sum + item.pendingAmount,
		0,
	);
	const totalManualFeeHistoryAmount = manualFeeHistories.reduce(
		(sum, item) => sum + item.amount,
		0,
	);
	const missingBillables = billableItems.filter(
		(item) => item.status === "UNAPPLIED",
	);
	const totalUnapplied = missingBillables.length + manualFeeHistories.length;

	return {
		student: {
			id: student.id,
			name: getStudentName(student),
			currentClassroom: getDepartmentName(currentTermForm.classroomDepartment),
			currentTerm:
				currentTermForm.sessionTerm?.title &&
				currentTermForm.sessionTerm?.session?.title
					? `${currentTermForm.sessionTerm.title} • ${currentTermForm.sessionTerm.session.title}`
					: null,
		},
		currentTermForm: {
			id: currentTermForm.id,
			classroomDepartmentId: currentTermForm.classroomDepartmentId,
			sessionTermId: currentTermForm.sessionTermId,
		},
		alert:
			totalUnapplied > 0
				? {
						variant: "warning" as const,
						title: "Charges still need to be applied",
						description: `${totalUnapplied} current-term charge${totalUnapplied > 1 ? "s are" : " is"} available for this student but not yet on the term sheet.`,
					}
				: null,
		summary: {
			totalDue:
				totalBillableAmount +
				otherCharges.reduce((sum, item) => sum + item.amount, 0) +
				feeItems.reduce((sum, item) => sum + item.amount, 0) +
				totalManualFeeHistoryAmount,
			totalPaid:
				billableItems.reduce((sum, item) => sum + item.paidAmount, 0) +
				otherCharges.reduce((sum, item) => sum + item.paidAmount, 0) +
				feeItems.reduce((sum, item) => sum + item.paidAmount, 0),
			totalPending:
				totalBillablePending +
				totalOtherPending +
				totalFeeItemsPending +
				totalManualFeeHistoryAmount,
		},
		billables: billableItems,
		feeItems,
		otherCharges,
		manualBillables,
		manualFeeHistories,
	};
}

async function getOrCreateWallet(
	db: any,
	{
		name,
		type,
		schoolId,
		termId,
	}: { name: string; type: string; schoolId: string; termId: string },
) {
	return db.wallet.upsert({
		where: {
			name_schoolProfileId_sessionTermId_type: {
				name,
				schoolProfileId: schoolId,
				sessionTermId: termId,
				type,
			},
		},
		update: {},
		create: { name, type, schoolProfileId: schoolId, sessionTermId: termId },
		select: { id: true, name: true },
	});
}

async function payBill(
	db: any,
	{
		billId,
		amount,
		date,
		schoolId,
		termId,
	}: {
		billId: string;
		amount: number;
		date?: Date | null;
		schoolId: string;
		termId: string;
	},
) {
	const bill = await db.bills.findFirstOrThrow({
		where: { id: billId, billPaymentId: null },
		select: { walletId: true, title: true },
	});

	const walletId =
		bill.walletId ||
		(
			await getOrCreateWallet(db, {
				name: bill.title || "General",
				type: "bill",
				schoolId,
				termId,
			})
		).id;

	const transaction = await db.walletTransactions.create({
		data: {
			amount,
			walletId,
			type: "debit",
			status: "success",
			transactionDate: date ?? new Date(),
		},
	});

	const invoice = await db.billInvoice.create({
		data: { amount },
	});

	const payment = await db.billPayment.create({
		data: {
			amount,
			transactionId: transaction.id,
			invoiceId: invoice.id,
			bills: { connect: { id: billId } },
		},
	});

	await db.bills.update({
		where: { id: billId },
		data: { billPaymentId: payment.id },
	});

	return { success: true, paymentId: payment.id };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const financeRouter = createTRPCRouter({
	// ── Accounting Streams ──────────────────────────────────────────────────────

	getStreams: publicProcedure
		.input(streamFilterSchema)
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			const where =
				input.filter === "session"
					? {
							schoolProfileId: ctx.profile.schoolId,
							sessionTerm: {
								session: { id: input.sessionId || ctx.profile.sessionId },
							},
							deletedAt: null,
						}
					: {
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: termId,
							deletedAt: null,
						};

			const wallets = await ctx.db.wallet.findMany({
				where,
				select: {
					id: true,
					name: true,
					type: true,
					defaultType: true,
					studentTransactions: {
						where: { status: "success", deletedAt: null },
						select: { amount: true, type: true },
					},
				},
				orderBy: { createdAt: "asc" },
			});

			return wallets.map((w) => {
				const incoming = w.studentTransactions
					.filter((t) => t.type !== "transfer-out" && t.type !== "debit")
					.reduce((s, t) => s + (t.amount || 0), 0);
				const outgoing = w.studentTransactions
					.filter((t) => t.type === "transfer-out" || t.type === "debit")
					.reduce((s, t) => s + (t.amount || 0), 0);
				return {
					id: w.id,
					name: w.name,
					type: w.type,
					defaultType: (w as any).defaultType ?? "incoming",
					totalIn: incoming,
					totalOut: outgoing,
					balance: incoming - outgoing,
				};
			});
		}),

	getStreamDetails: publicProcedure
		.input(z.object({ streamId: z.string() }))
		.query(async ({ input, ctx }) => {
			const wallet = await ctx.db.wallet.findFirst({
				where: {
					id: input.streamId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					name: true,
					type: true,
					defaultType: true,
					createdAt: true,
					sessionTerm: {
						select: {
							title: true,
							session: { select: { title: true } },
						},
					},
					studentTransactions: {
						where: {
							deletedAt: null,
							status: { not: "cancelled" },
						},
						select: {
							id: true,
							amount: true,
							summary: true,
							type: true,
							status: true,
							transactionDate: true,
							createdAt: true,
							billPayment: {
								select: {
									bills: {
										where: { deletedAt: null },
										take: 1,
										orderBy: { createdAt: "desc" },
										select: {
											id: true,
											title: true,
											description: true,
										},
									},
								},
							},
							studentPayment: {
								select: {
									id: true,
									description: true,
									status: true,
									studentTermForm: {
										select: {
											student: {
												select: {
													name: true,
													otherName: true,
													surname: true,
												},
											},
											classroomDepartment: {
												select: {
													departmentName: true,
													classRoom: { select: { name: true } },
												},
											},
										},
									},
								},
							},
						},
						orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
					},
				},
			});

			if (!wallet) {
				throw new Error("Account stream not found");
			}

			const totalIn = wallet.studentTransactions
				.filter((transaction) => {
					return (
						transaction.status === "success" &&
						transaction.type !== "transfer-out" && transaction.type !== "debit"
					);
				})
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

			const totalOut = wallet.studentTransactions
				.filter((transaction) => {
					return (
						transaction.status === "success" &&
						(transaction.type === "transfer-out" || transaction.type === "debit")
					);
				})
				.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

			return {
				id: wallet.id,
				name: wallet.name,
				type: wallet.type,
				defaultType: (wallet as any).defaultType ?? "incoming",
				createdAt: wallet.createdAt,
				totalIn,
				totalOut,
				balance: totalIn - totalOut,
				periodLabel:
					wallet.sessionTerm?.title && wallet.sessionTerm.session?.title
						? `${wallet.sessionTerm.session.title} • ${wallet.sessionTerm.title}`
						: null,
				transactions: wallet.studentTransactions.map((transaction) => {
					const bill = transaction.billPayment?.bills[0] ?? null;
					const student =
						transaction.studentPayment?.studentTermForm?.student ?? null;
					const studentClassroom = getDepartmentName(
						transaction.studentPayment?.studentTermForm?.classroomDepartment,
					);
					const direction =
						transaction.type === "transfer-out" || transaction.type === "debit"
							? "out"
							: "in";

					return {
						id: transaction.id,
						amount: transaction.amount,
						type: transaction.type,
						status: transaction.status ?? "success",
						direction,
						summary: transaction.summary,
						transactionDate:
							transaction.transactionDate ?? transaction.createdAt ?? null,
						createdAt: transaction.createdAt ?? null,
						title:
							transaction.summary ||
							bill?.title ||
							(student ? "Student payment" : "Account transaction"),
						description:
							transaction.studentPayment?.description ||
							bill?.description ||
							transaction.summary ||
							null,
						partyName: student
							? getStudentName(student)
							: transaction.type?.startsWith("transfer")
								? "Internal transfer"
								: bill?.title || "School account",
						studentClassroom,
						reference: transaction.id.slice(0, 8).toUpperCase(),
					};
				}),
			};
		}),

	createStream: publicProcedure
		.input(
			z.object({
				name: z.string().min(1),
				type: z.string().default("fee"),
				defaultType: z.enum(["incoming", "outgoing"]).default("incoming"),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.wallet.upsert({
				where: {
					name_schoolProfileId_sessionTermId_type: {
						name: input.name,
						schoolProfileId: ctx.profile.schoolId!,
						sessionTermId: ctx.profile.termId!,
						type: input.type,
					},
				},
				update: { defaultType: input.defaultType } as any,
				create: {
					name: input.name,
					type: input.type,
					defaultType: input.defaultType,
					schoolProfileId: ctx.profile.schoolId!,
					sessionTermId: ctx.profile.termId!,
				} as any,
				select: { id: true, name: true },
			});
		}),

	transferFunds: publicProcedure
		.input(
			z.object({
				fromWalletId: z.string(),
				toWalletId: z.string(),
				amount: z.number().positive(),
				description: z.string().optional().nullable(),
				date: z.date().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const note = input.description || "Fund transfer";
			const date = input.date ?? new Date();
			return ctx.db.$transaction(async (tx) => {
				await tx.walletTransactions.create({
					data: {
						amount: input.amount,
						walletId: input.fromWalletId,
						type: "transfer-out",
						summary: note,
						status: "success",
						transactionDate: date,
					},
				});
				await tx.walletTransactions.create({
					data: {
						amount: input.amount,
						walletId: input.toWalletId,
						type: "transfer-in",
						summary: note,
						status: "success",
						transactionDate: date,
					},
				});
				return { success: true };
			}, {
				maxWait: 10000,
				timeout: 20000,
			});
		}),

	addFund: publicProcedure
		.input(addFundSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.db.wallet.findFirstOrThrow({
				where: {
					id: input.walletId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
			});

			const fund = await ctx.db.funds.create({
				data: {
					title: input.title,
					description: input.description ?? "",
					amount: input.amount,
					pendingAmount: 0,
					walletId: input.walletId,
				},
			});

			await ctx.db.walletTransactions.create({
				data: {
					amount: input.amount,
					walletId: input.walletId,
					type: "credit",
					summary: input.title,
					status: "success",
					transactionDate: input.date ?? new Date(),
					fundId: fund.id,
				},
			});

			return { success: true };
		}),

	withdrawFund: publicProcedure
		.input(withdrawFundSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.db.wallet.findFirstOrThrow({
				where: {
					id: input.walletId,
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
			});

			await ctx.db.walletTransactions.create({
				data: {
					amount: input.amount,
					walletId: input.walletId,
					type: "debit",
					summary: input.title,
					status: "success",
					transactionDate: input.date ?? new Date(),
				},
			});

			return { success: true };
		}),

	// ── Service Payments ────────────────────────────────────────────────────────

	getServicePayments: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			return ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					staffTermProfileId: null,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					billPaymentId: true,
					createdAt: true,
					billable: { select: { title: true, type: true } },
					billPayment: {
						select: {
							amount: true,
							transaction: { select: { transactionDate: true } },
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
		}),

	createServicePayment: publicProcedure
		.input(
			z.object({
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
				date: z.date().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const wallet = await getOrCreateWallet(ctx.db, {
				name: "Services",
				type: "bill",
				schoolId: ctx.profile.schoolId!,
				termId: ctx.profile.termId!,
			});

			return ctx.db.bills.create({
				data: {
					title: input.title,
					description: input.description,
					amount: input.amount,
					schoolProfileId: ctx.profile.schoolId!,
					schoolSessionId: ctx.profile.sessionId!,
					sessionTermId: ctx.profile.termId!,
					walletId: wallet.id,
				},
				select: { id: true },
			});
		}),

	payServiceBill: publicProcedure
		.input(payBillSchema)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(async (tx) => {
				return payBill(tx, {
					billId: input.billId,
					amount: input.amount,
					date: input.date,
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});
			});
		}),

	// ── Payroll ─────────────────────────────────────────────────────────────────

	getPayroll: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			const termId = input.termId || ctx.profile.termId;
			return ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					staffTermProfileId: { not: null },
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					billPaymentId: true,
					createdAt: true,
					staffTermProfile: {
						select: {
							id: true,
							staffProfile: {
								select: { id: true, name: true, title: true },
							},
						},
					},
					billPayment: {
						select: {
							amount: true,
							transaction: { select: { transactionDate: true } },
						},
					},
				},
				orderBy: [
					{
						staffTermProfile: {
							staffProfile: { name: "asc" },
						},
					},
					{ createdAt: "desc" },
				],
			});
		}),

	createStaffBill: publicProcedure
		.input(
			z.object({
				staffProfileId: z.string(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(async (tx) => {
				let termProfile = await tx.staffTermProfile.findFirst({
					where: {
						staffProfileId: input.staffProfileId,
						sessionTermId: ctx.profile.termId!,
						schoolSessionId: ctx.profile.sessionId!,
						deletedAt: null,
					},
					select: { id: true },
				});

				if (!termProfile) {
					termProfile = await tx.staffTermProfile.create({
						data: {
							staffProfileId: input.staffProfileId,
							sessionTermId: ctx.profile.termId!,
							schoolSessionId: ctx.profile.sessionId!,
						},
						select: { id: true },
					});
				}

				const wallet = await getOrCreateWallet(tx, {
					name: "Payroll",
					type: "bill",
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});

				return tx.bills.create({
					data: {
						title: input.title,
						description: input.description,
						amount: input.amount,
						schoolProfileId: ctx.profile.schoolId!,
						schoolSessionId: ctx.profile.sessionId!,
						sessionTermId: ctx.profile.termId!,
						staffTermProfileId: termProfile.id,
						walletId: wallet.id,
					},
					select: { id: true },
				});
			});
		}),

	payStaffBill: publicProcedure
		.input(payBillSchema)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(async (tx) => {
				return payBill(tx, {
					billId: input.billId,
					amount: input.amount,
					date: input.date,
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});
			});
		}),

	// ── Staff list (for payroll form) ───────────────────────────────────────────

	getStaff: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.staffProfile.findMany({
			where: { schoolProfileId: ctx.profile.schoolId, deletedAt: null },
			select: { id: true, name: true, title: true },
			orderBy: { name: "asc" },
		});
	}),

	// ── Student Payments ────────────────────────────────────────────────────────

	searchStudentsForPayment: publicProcedure
		.input(z.object({ query: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const query = input?.query?.trim();
			const students = await ctx.db.students.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
					...(query
						? {
								OR: [
									{ name: { contains: query, mode: "insensitive" } },
									{ surname: { contains: query, mode: "insensitive" } },
									{ otherName: { contains: query, mode: "insensitive" } },
								],
							}
						: {}),
				},
				take: 12,
				orderBy: [{ name: "asc" }, { surname: "asc" }],
				select: {
					id: true,
					name: true,
					surname: true,
					otherName: true,
					termForms: {
						where: {
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						take: 1,
						select: {
							id: true,
							classroomDepartment: {
								select: {
									departmentName: true,
									classRoom: { select: { name: true } },
								},
							},
							sessionTerm: {
								select: {
									title: true,
									session: { select: { title: true } },
								},
							},
						},
					},
				},
			});

			return Promise.all(
				students.map(async (student) => {
					const currentTermForm = student.termForms[0];
					const latestTermForm =
						currentTermForm ||
						(await ctx.db.studentTermForm.findFirst({
							where: {
								studentId: student.id,
								deletedAt: null,
							},
							orderBy: { createdAt: "desc" },
							select: {
								id: true,
								classroomDepartment: {
									select: {
										departmentName: true,
										classRoom: { select: { name: true } },
									},
								},
								sessionTerm: {
									select: {
										title: true,
										session: { select: { title: true } },
									},
								},
							},
						}));

					return {
						id: student.id,
						name: getStudentName(student),
						classroom: getDepartmentName(latestTermForm?.classroomDepartment),
						currentTermLabel:
							latestTermForm?.sessionTerm?.title &&
							latestTermForm?.sessionTerm?.session?.title
								? `${latestTermForm.sessionTerm.title} • ${latestTermForm.sessionTerm.session.title}`
								: null,
						hasCurrentTermSheet: Boolean(currentTermForm),
					};
				}),
			);
		}),

	getReceivePaymentData: publicProcedure
		.input(z.object({ studentId: z.string() }))
		.query(async ({ input, ctx }) => {
			return getStudentReceivePaymentData(ctx, input.studentId);
		}),

	getStudentPayments: publicProcedure
		.input(z.object({ studentId: z.string().optional().nullable() }))
		.query(async ({ input, ctx }) => {
			if (!input.studentId) return [];
			return ctx.db.studentPayment.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					studentTermForm: { student: { id: input.studentId } },
				},
				select: {
					id: true,
					amount: true,
					status: true,
					paymentType: true,
					description: true,
					type: true,
					createdAt: true,
					studentFee: { select: { feeTitle: true } },
					walletTransaction: {
						select: {
							id: true,
							transactionDate: true,
							status: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
		}),

	reverseStudentPayment: publicProcedure
		.input(
			z.object({
				studentPaymentId: z.string(),
				transactionId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(async (tx) => {
				await tx.walletTransactions.update({
					where: { id: input.transactionId },
					data: { status: "cancelled" },
				});
				const payment = await tx.studentPayment.update({
					where: { id: input.studentPaymentId },
					data: { status: "cancelled" },
					select: {
						amount: true,
						studentFee: { select: { id: true } },
					},
				});
				if (payment.studentFee?.id && payment.amount) {
					await tx.studentFee.update({
						where: { id: payment.studentFee.id },
						data: { pendingAmount: { increment: payment.amount } },
					});
				}
				return { success: true };
			});
		}),

	receiveStudentPayment: publicProcedure
		.input(receivePaymentSchema)
		.mutation(async ({ input, ctx }) => {
			const totalAllocated = input.allocations.reduce(
				(sum, allocation) => sum + allocation.amountToPay,
				0,
			);

			if (Math.abs(totalAllocated - input.amountReceived) > 0.001) {
				throw new Error("Allocated total must match the amount received.");
			}

			return ctx.db.$transaction(async (tx) => {
				const studentTermForm = await tx.studentTermForm.findFirstOrThrow({
					where: {
						id: input.studentTermFormId,
						studentId: input.studentId,
						schoolProfileId: ctx.profile.schoolId,
						deletedAt: null,
					},
					select: {
						id: true,
						studentId: true,
						schoolSessionId: true,
						sessionTermId: true,
						classroomDepartmentId: true,
					},
				});

				const createdPayments: Array<{
					id: string;
					amount: number | null;
					paymentType: string;
				}> = [];

				for (const allocation of input.allocations) {
					let studentFeeId = allocation.studentFeeId || null;
					let feeTitle = allocation.title || "Payment";
					let walletId: string | null = null;

					if (allocation.source === "studentFee") {
						const fee = await tx.studentFee.findFirstOrThrow({
							where: {
								id: allocation.studentFeeId || undefined,
								studentTermFormId: studentTermForm.id,
								deletedAt: null,
								status: { not: "cancelled" },
							},
							select: {
								id: true,
								feeTitle: true,
								pendingAmount: true,
								billAmount: true,
							},
						});

						if (allocation.amountToPay > fee.pendingAmount) {
							throw new Error(
								`Payment for ${fee.feeTitle || "charge"} exceeds the pending amount.`,
							);
						}

						studentFeeId = fee.id;
						feeTitle = fee.feeTitle || feeTitle;

						const fallbackWallet = await getOrCreateWallet(tx, {
							name: feeTitle || "General",
							type: "fee",
							schoolId: ctx.profile.schoolId!,
							termId: ctx.profile.termId!,
						});
						walletId = fallbackWallet.id;
					}

					if (allocation.source === "billable") {
						const history = await tx.billableHistory.findFirstOrThrow({
							where: {
								id: allocation.billableHistoryId || undefined,
								termId: ctx.profile.termId,
								current: true,
								deletedAt: null,
							},
							select: {
								id: true,
								amount: true,
								walletId: true,
								billable: {
									select: {
										title: true,
										description: true,
									},
								},
							},
						});

						let existingFee = await tx.studentFee.findFirst({
							where: {
								studentTermFormId: studentTermForm.id,
								billablePriceId: history.id,
								deletedAt: null,
								status: { not: "cancelled" },
							},
							select: {
								id: true,
								pendingAmount: true,
								feeTitle: true,
							},
						});

						if (!existingFee) {
							existingFee = await tx.studentFee.create({
								data: {
									billAmount: history.amount,
									pendingAmount: history.amount,
									feeTitle: history.billable.title,
									description: history.billable.description,
									billablePriceId: history.id,
									schoolProfileId: ctx.profile.schoolId!,
									studentTermFormId: studentTermForm.id,
									schoolSessionId: studentTermForm.schoolSessionId,
									studentId: input.studentId,
									status: "active",
								},
								select: {
									id: true,
									pendingAmount: true,
									feeTitle: true,
								},
							});
						}

						if (allocation.amountToPay > existingFee.pendingAmount) {
							throw new Error(
								`Payment for ${existingFee.feeTitle || history.billable.title} exceeds the pending amount.`,
							);
						}

						const fallbackWallet =
							history.walletId ||
							(
								await getOrCreateWallet(tx, {
									name: history.billable.title || "General",
									type: "fee",
									schoolId: ctx.profile.schoolId!,
									termId: ctx.profile.termId!,
								})
							).id;

						walletId = fallbackWallet;
						studentFeeId = existingFee.id;
						feeTitle =
							existingFee.feeTitle || history.billable.title || feeTitle;
					}

					if (allocation.source === "feeHistory") {
						const fh = await tx.feeHistory.findFirstOrThrow({
							where: {
								id: allocation.feeHistoryId || undefined,
								termId: ctx.profile.termId,
								current: true,
								deletedAt: null,
							},
							select: {
								id: true,
								amount: true,
								walletId: true,
								classroomDepartments: {
									where: { deletedAt: null },
									select: { id: true },
								},
								fee: { select: { title: true, description: true } },
							},
						});

						if (
							fh.classroomDepartments.length > 0 &&
							!fh.classroomDepartments.some(
								(department) =>
									department.id === studentTermForm.classroomDepartmentId,
							)
						) {
							throw new Error(
								"This fee does not apply to the student's current classroom.",
							);
						}

						let existingFee = await tx.studentFee.findFirst({
							where: {
								studentTermFormId: studentTermForm.id,
								feeHistoryId: fh.id,
								deletedAt: null,
								status: { not: "cancelled" },
							},
							select: { id: true, pendingAmount: true, feeTitle: true },
						});

						if (!existingFee) {
							existingFee = await tx.studentFee.create({
								data: {
									billAmount: fh.amount,
									pendingAmount: fh.amount,
									feeTitle: fh.fee.title,
									description: fh.fee.description,
									feeHistoryId: fh.id,
									schoolProfileId: ctx.profile.schoolId!,
									studentTermFormId: studentTermForm.id,
									schoolSessionId: studentTermForm.schoolSessionId,
									studentId: input.studentId,
									status: "active",
								},
								select: { id: true, pendingAmount: true, feeTitle: true },
							});
						}

						if (allocation.amountToPay > existingFee.pendingAmount) {
							throw new Error(
								`Payment for ${existingFee.feeTitle || fh.fee.title} exceeds the pending amount.`,
							);
						}

						walletId =
							fh.walletId ||
							(
								await getOrCreateWallet(tx, {
									name: fh.fee.title || "General",
									type: "fee",
									schoolId: ctx.profile.schoolId!,
									termId: ctx.profile.termId!,
								})
							).id;

						studentFeeId = existingFee.id;
						feeTitle = existingFee.feeTitle || fh.fee.title || feeTitle;
					}

					if (allocation.source === "manual") {
						const manualFee = await tx.studentFee.create({
							data: {
								billAmount: allocation.amountDue,
								pendingAmount: allocation.amountDue,
								feeTitle: allocation.title || "Manual Charge",
								description: allocation.description,
								schoolProfileId: ctx.profile.schoolId!,
								studentTermFormId: studentTermForm.id,
								schoolSessionId: studentTermForm.schoolSessionId,
								studentId: input.studentId,
								status: "active",
							},
							select: {
								id: true,
								feeTitle: true,
								pendingAmount: true,
							},
						});

						studentFeeId = manualFee.id;
						feeTitle = manualFee.feeTitle || feeTitle;
						walletId = (
							await getOrCreateWallet(tx, {
								name: "Sales",
								type: "fee",
								schoolId: ctx.profile.schoolId!,
								termId: ctx.profile.termId!,
							})
						).id;
					}

					if (!studentFeeId || !walletId) {
						throw new Error("Could not resolve the selected payment line.");
					}

					const walletTransaction = await tx.walletTransactions.create({
						data: {
							amount: allocation.amountToPay,
							walletId,
							type: "credit",
							summary: [input.paymentMethod, input.reference]
								.filter(Boolean)
								.join(" • "),
							status: "success",
							transactionDate: input.paymentDate ?? new Date(),
							studentWalletTransaction: {
								create: {
									studentId: input.studentId,
									amount: allocation.amountToPay,
									transactionType: "debit",
									status: "success",
									description: feeTitle,
									transactionDate: input.paymentDate ?? new Date(),
								},
							},
						},
						select: { id: true },
					});

					const payment = await tx.studentPayment.create({
						data: {
							type: "FEE",
							paymentType: feeTitle,
							amount: allocation.amountToPay,
							status: "success",
							description: [input.paymentMethod, input.reference]
								.filter(Boolean)
								.join(" • "),
							schoolProfileId: ctx.profile.schoolId!,
							studentTermFormId: studentTermForm.id,
							studentBillPaymentsId: studentFeeId,
							walletTransactionsId: walletTransaction.id,
						},
						select: {
							id: true,
							amount: true,
							paymentType: true,
						},
					});

					await tx.studentFee.update({
						where: { id: studentFeeId },
						data: {
							pendingAmount: {
								decrement: allocation.amountToPay,
							},
						},
					});

					createdPayments.push(payment);
				}

				return {
					success: true,
					count: createdPayments.length,
					totalAllocated,
					paymentIds: createdPayments.map((payment) => payment.id),
				};
			}, {
				maxWait: 10000,
				timeout: 20000,
			});
		}),

	// ── Billables ───────────────────────────────────────────────────────────────

	getBillables: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const billables = await ctx.db.billable.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
					type: true,
					billableHistory: {
						where: { current: true, termId: termId || undefined },
						take: 1,
						select: {
							id: true,
							amount: true,
							wallet: { select: { id: true, name: true } },
							classroomDepartments: {
								where: { deletedAt: null },
								select: {
									id: true,
									departmentName: true,
									classRoom: { select: { name: true } },
								},
							},
						},
					},
				},
				orderBy: { title: "asc" },
			});
			return billables.map((b) => ({
				id: b.id,
				title: b.title,
				description: b.description,
				amount: b.billableHistory?.[0]?.amount ?? b.amount,
				type: b.type,
				historyId: b.billableHistory?.[0]?.id,
				streamId: b.billableHistory?.[0]?.wallet?.id ?? null,
				streamName: b.billableHistory?.[0]?.wallet?.name ?? null,
				classroomDepartments:
					b.billableHistory?.[0]?.classroomDepartments.map((department) => ({
						id: department.id,
						name: getDepartmentName(department),
					})) ?? [],
			}));
		}),

	createBillable: publicProcedure
		.input(
			z.object({
				title: z.string().min(1),
				amount: z.number().min(1),
				description: z.string().optional().nullable(),
				type: z.enum(["SALARY", "MISC", "OTHER"]).default("OTHER"),
				streamId: z.string().optional().nullable(),
				streamName: z.string().optional().nullable(),
				classroomDepartmentIds: z.array(z.string()).default([]),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const wallet = input.streamId
				? await ctx.db.wallet.findFirst({
						where: {
							id: input.streamId,
							schoolProfileId: ctx.profile.schoolId,
							sessionTermId: ctx.profile.termId,
							deletedAt: null,
						},
						select: { id: true },
					})
				: null;

			const resolvedWallet =
				wallet ||
				(input.streamName?.trim()
					? await getOrCreateWallet(ctx.db, {
							name: input.streamName.trim(),
							type: "fee",
							schoolId: ctx.profile.schoolId!,
							termId: ctx.profile.termId!,
						})
					: null);

			return ctx.db.billable.create({
				data: {
					title: input.title,
					amount: input.amount,
					description: input.description,
					type: input.type,
					schoolProfileId: ctx.profile.schoolId!,
					billableHistory: {
						create: {
							amount: input.amount,
							current: true,
							schoolSessionId: ctx.profile.sessionId!,
							termId: ctx.profile.termId!,
							walletId: resolvedWallet?.id,
							classroomDepartments: input.classroomDepartmentIds.length
								? {
										connect: input.classroomDepartmentIds.map((id) => ({ id })),
									}
								: undefined,
						},
					},
				},
			});
		}),

	// ── Bills ────────────────────────────────────────────────────────────────────

	getBills: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const bills = await ctx.db.bills.findMany({
				where: {
					schoolProfileId: ctx.profile.schoolId,
					sessionTermId: termId!,
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					amount: true,
					description: true,
					billPaymentId: true,
					billable: { select: { description: true } },
					staffTermProfile: {
						select: { staffProfile: { select: { name: true, id: true } } },
					},
					sessionTerm: { select: { title: true, id: true } },
				},
				orderBy: { createdAt: "desc" },
			});
			return bills.map((b) => ({
				id: b.id,
				title: b.staffTermProfile
					? b.staffTermProfile.staffProfile?.name
					: b.title,
				description: b.description,
				amount: b.amount,
				status: b.billPaymentId ? "PAID" : "PENDING",
				termTitle: b.sessionTerm?.title,
			}));
		}),

	createBill: publicProcedure
		.input(
			z.object({
				title: z.string().min(1),
				amount: z.number().min(1),
				billableId: z.string().optional().nullable(),
				billableHistoryId: z.string().optional().nullable(),
				staffTermProfileId: z.string().optional().nullable(),
				description: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const wallet = await getOrCreateWallet(ctx.db, {
				name: input.title || "General",
				type: "bill",
				schoolId: ctx.profile.schoolId!,
				termId: ctx.profile.termId!,
			});
			return ctx.db.bills.create({
				data: {
					title: input.title,
					description: input.description,
					amount: input.amount,
					sessionTermId: ctx.profile.termId!,
					schoolProfileId: ctx.profile.schoolId!,
					schoolSessionId: ctx.profile.sessionId!,
					walletId: wallet.id,
					billableId: input.billableId || undefined,
					billableHistoryId: input.billableHistoryId || undefined,
					staffTermProfileId: input.staffTermProfileId || undefined,
				},
			});
		}),

	// ── Transactions ─────────────────────────────────────────────────────────────

	getTransactions: publicProcedure
		.input(z.object({ termId: z.string().optional().nullable() }).optional())
		.query(async ({ input, ctx }) => {
			const termId = input?.termId || ctx.profile.termId;
			const txs = await ctx.db.walletTransactions.findMany({
				where: {
					wallet: {
						schoolProfileId: ctx.profile.schoolId,
						sessionTermId: termId!,
					},
					OR: [
						{ billPayment: { deletedAt: null } },
						{
							studentPayment: {
								deletedAt: null,
								studentTermForm: { student: { deletedAt: null } },
							},
						},
					],
				},
				select: {
					id: true,
					amount: true,
					summary: true,
					type: true,
					createdAt: true,
					wallet: {
						select: {
							sessionTerm: {
								select: {
									title: true,
									session: { select: { title: true } },
								},
							},
						},
					},
					studentPayment: {
						select: {
							studentTermForm: {
								select: {
									sessionTerm: {
										select: {
											title: true,
											session: { select: { title: true } },
										},
									},
									student: {
										select: { name: true, otherName: true, surname: true },
									},
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
			return txs.map((tx) => ({
				id: tx.id,
				amount: tx.amount,
				type: tx.type,
				createdAt: tx.createdAt,
				student: tx.studentPayment?.studentTermForm?.student,
				billTerm: tx.studentPayment?.studentTermForm?.sessionTerm,
				invoiceTerm: tx.wallet?.sessionTerm,
			}));
		}),

	// ── Student Purchase (stationary, uniform, etc.) ────────────────────────────

	getStudentPurchaseSuggestions: publicProcedure
		.input(
			z
				.object({
					query: z.string().optional().nullable(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			const query = input?.query?.trim();
			const purchases = await ctx.db.studentPurchase.findMany({
				where: {
					deletedAt: null,
					payments: {
						some: {
							schoolProfileId: ctx.profile.schoolId,
							deletedAt: null,
							type: "PURCHASE",
						},
					},
					...(query
						? {
								OR: [
									{ title: { contains: query, mode: "insensitive" } },
									{ description: { contains: query, mode: "insensitive" } },
								],
							}
						: {}),
				},
				distinct: ["title", "description", "amount"],
				orderBy: { createdAt: "desc" },
				take: 20,
				select: {
					id: true,
					title: true,
					description: true,
					amount: true,
				},
			});

			return purchases.map((purchase) => ({
				id: purchase.id,
				title: purchase.title,
				description: purchase.description,
				amount: purchase.amount,
			}));
		}),

	createStudentPurchase: publicProcedure
		.input(
			z.object({
				studentId: z.string(),
				studentTermFormId: z.string(),
				title: z.string().min(1),
				description: z.string().optional().nullable(),
				amount: z.number().positive(),
				paid: z.boolean().default(false),
				paymentMethod: z.string().optional().nullable(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			return ctx.db.$transaction(async (tx) => {
				const wallet = await getOrCreateWallet(tx, {
					name: "Sales",
					type: "fee",
					schoolId: ctx.profile.schoolId!,
					termId: ctx.profile.termId!,
				});

				if (!input.paid) {
					const draftWalletTx = await tx.walletTransactions.create({
						data: {
							amount: 0,
							walletId: wallet.id,
							type: "credit",
							status: "draft",
							transactionDate: new Date(),
						},
					});
					const purchase = await tx.studentPurchase.create({
						data: {
							title: input.title,
							description: input.description ?? "",
							amount: input.amount,
							paid: 0,
						},
					});
					await tx.studentPayment.create({
						data: {
							type: "PURCHASE",
							paymentType: input.title,
							amount: input.amount,
							status: "draft",
							description: input.paymentMethod || input.description,
							schoolProfileId: ctx.profile.schoolId!,
							studentTermFormId: input.studentTermFormId,
							walletTransactionsId: draftWalletTx.id,
							studentPurchaseId: purchase.id,
						},
					});
					return { success: true };
				}

				const walletTx = await tx.walletTransactions.create({
					data: {
						amount: input.amount,
						walletId: wallet.id,
						type: "credit",
						status: "success",
						transactionDate: new Date(),
					},
				});

				const purchase = await tx.studentPurchase.create({
					data: {
						title: input.title,
						description: input.description ?? "",
						amount: input.amount,
						paid: input.amount,
					},
				});

				await tx.studentPayment.create({
					data: {
						type: "PURCHASE",
						paymentType: input.title,
						amount: input.amount,
						status: "success",
						description: input.paymentMethod || input.description,
						schoolProfileId: ctx.profile.schoolId!,
						studentTermFormId: input.studentTermFormId,
						walletTransactionsId: walletTx.id,
						studentPurchaseId: purchase.id,
					},
				});

				return { success: true };
			}, {
				maxWait: 10000,
				timeout: 20000,
			});
		}),
});
