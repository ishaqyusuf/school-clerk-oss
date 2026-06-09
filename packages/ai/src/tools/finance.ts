import { Prisma, prisma } from "@school-clerk/db";
import { tool } from "ai";
import { z } from "zod";
import { studentDisplayName, type SchoolAiToolContext, type SchoolAiToolHelpers } from "./context";

export function createFinanceTools(ctx: SchoolAiToolContext, helpers: SchoolAiToolHelpers) {
	const {
		finishAssistantToolExecution,
		getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity,
		requiresConfirmationResult,
	} = helpers;

	return {
		getStudentPaymentData: tool({
			description: "Fetch current-term fee balances for a student.",
			inputSchema: z.object({
				studentId: z.string(),
				studentTermFormId: z.string(),
			}),
			execute: async ({ studentId, studentTermFormId }) => {
				const guarded = await guardCapability(
					"finance.read",
					"getStudentPaymentData",
					{ studentId, studentTermFormId },
					false,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const charges = await prisma.financeCharge.findMany({
						where: {
							schoolProfileId: ctx.schoolId,
							studentId,
							studentTermFormId,
							status: { notIn: ["CANCELLED", "WAIVED"] },
						},
						select: {
							id: true,
							title: true,
							description: true,
							amount: true,
							amountPaid: true,
							status: true,
							stream: { select: { id: true, name: true } },
						},
						orderBy: { createdAt: "asc" },
					});

					const student = await prisma.students.findFirst({
						where: { id: studentId, schoolProfileId: ctx.schoolId },
						select: { name: true, surname: true, otherName: true },
					});

					const output = {
						studentName: student ? studentDisplayName(student) : "Student",
						studentId,
						studentTermFormId,
						fees: charges.map((charge) => {
							const billAmount = Number(charge.amount ?? 0);
							const paidAmount = Number(charge.amountPaid ?? 0);
							const pendingAmount = Math.max(0, billAmount - paidAmount);
							const status =
								pendingAmount <= 0
									? ("PAID" as const)
									: paidAmount > 0
										? ("PARTIAL" as const)
										: ("PENDING" as const);

							return {
								id: charge.id,
								title: charge.title ?? "Fee",
								description: charge.description,
								billAmount,
								paidAmount,
								pendingAmount,
								status,
								streamName: charge.stream?.name ?? null,
							};
						}),
						totalPending: charges.reduce(
							(sum, charge) =>
								sum +
								Math.max(
									0,
									Number(charge.amount ?? 0) - Number(charge.amountPaid ?? 0),
								),
							0,
						),
					};

					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output,
					});
					return output;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error ? error.message : "Payment lookup failed",
					});
					throw error;
				}
			},
		}),

		receiveStudentPayment: tool({
			description:
				"Record a fee payment from a student. Requires explicit confirmation before the mutation is executed.",
			inputSchema: z.object({
				studentId: z.string(),
				studentName: z.string(),
				studentTermFormId: z.string(),
				amountReceived: z.number().positive(),
				paymentMethod: z.string().default("Cash"),
				allocations: z
					.array(
						z.object({
							studentFeeId: z.string(),
							feeTitle: z.string(),
							amountToPay: z.number().positive(),
						}),
					)
					.min(1),
				confirmationToken: z.string().optional(),
			}),
			execute: async ({
				confirmationToken,
				...actionInput
			}: {
				studentId: string;
				studentName: string;
				studentTermFormId: string;
				amountReceived: number;
				paymentMethod: string;
				allocations: {
					studentFeeId: string;
					feeTitle: string;
					amountToPay: number;
				}[];
				confirmationToken?: string;
			}) => {
				const guarded = await guardCapability(
					"finance.write",
					"receiveStudentPayment",
					actionInput,
					true,
				);
				if (guarded.blocked) return guarded.blocked;

				try {
					const totalAllocated = actionInput.allocations.reduce(
						(sum, item) => sum + item.amountToPay,
						0,
					);

					if (Math.abs(totalAllocated - actionInput.amountReceived) > 0.01) {
						const output = {
							blocked: true,
							toolName: "receiveStudentPayment",
							message: "Allocated fee amounts must match the amount received.",
						};
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					if (
						!isConfirmedMutation({
							ctx,
							toolName: "receiveStudentPayment",
							confirmationToken,
							actionInput,
						})
					) {
						const output = requiresConfirmationResult({
							ctx,
							toolName: "receiveStudentPayment",
							summary: `Receive ₦${actionInput.amountReceived.toLocaleString()} from ${actionInput.studentName}?`,
							actionInput,
						});
						await recordAssistantActivity({
							schoolId: ctx.schoolId,
							userId: ctx.userId,
							userName: ctx.userName,
							type: "assistant_action_requested",
							title: "AI payment confirmation requested",
							description: output.summary,
							meta: { toolName: "receiveStudentPayment", actionInput },
						});
						await finishAssistantToolExecution({
							toolExecutionId: guarded.executionId,
							status: "blocked",
							output,
						});
						return output;
					}

					const result = await prisma.$transaction(async (tx) => {
						const termForm = await tx.studentTermForm.findFirstOrThrow({
							where: {
								id: actionInput.studentTermFormId,
								studentId: actionInput.studentId,
								schoolProfileId: ctx.schoolId,
								deletedAt: null,
							},
							select: { id: true },
						});

						const paymentIds: string[] = [];

						for (const allocation of actionInput.allocations) {
							const charge = await tx.financeCharge.findFirstOrThrow({
								where: {
									id: allocation.studentFeeId,
									schoolProfileId: ctx.schoolId,
									studentId: actionInput.studentId,
									studentTermFormId: termForm.id,
									status: { notIn: ["CANCELLED", "WAIVED"] },
								},
								select: {
									id: true,
									title: true,
									payerType: true,
									studentId: true,
									staffProfileId: true,
									streamId: true,
									amount: true,
									amountPaid: true,
									stream: { select: { accountType: true } },
								},
							});

							const chargeAmount = Number(charge.amount ?? 0);
							const currentPaid = Number(charge.amountPaid ?? 0);
							const pendingAmount = Math.max(0, chargeAmount - currentPaid);

							if (pendingAmount < allocation.amountToPay) {
								throw new Error(
									`Cannot allocate more than the remaining balance for ${allocation.feeTitle}.`,
								);
							}

							const amount = new Prisma.Decimal(allocation.amountToPay);
							const payment = await tx.financePayment.create({
								data: {
									schoolProfileId: ctx.schoolId,
									streamId: charge.streamId,
									payerType: charge.payerType,
									studentId: charge.studentId,
									staffProfileId: charge.staffProfileId,
									amount,
									paymentDate: new Date(),
									method: actionInput.paymentMethod,
									note: `AI payment for ${charge.title || allocation.feeTitle}`,
									receivedById: ctx.userId,
								},
								select: { id: true },
							});

							await tx.financePaymentAllocation.create({
								data: {
									paymentId: payment.id,
									chargeId: charge.id,
									amount,
								},
							});

							const nextPaid = currentPaid + allocation.amountToPay;
							const nextStatus =
								nextPaid >= chargeAmount ? "PAID" : "PARTIALLY_PAID";

							await tx.financeCharge.update({
								where: { id: charge.id },
								data: {
									amountPaid: { increment: allocation.amountToPay },
									status: nextStatus,
								},
							});

							await tx.financeLedgerEntry.create({
								data: {
									schoolProfileId: ctx.schoolId,
									streamId: charge.streamId,
									direction:
										charge.stream.accountType === "DEBIT" ? "DEBIT" : "CREDIT",
									sourceType: "PAYMENT",
									sourceId: payment.id,
									amount,
									occurredAt: new Date(),
									note: `AI payment for ${charge.title || allocation.feeTitle}`,
									createdById: ctx.userId,
									chargeId: charge.id,
									paymentId: payment.id,
								},
							});

							paymentIds.push(payment.id);
						}

						return { paymentIds };
					});

					const output = {
						success: true,
						studentName: actionInput.studentName,
						amountReceived: actionInput.amountReceived,
						paymentMethod: actionInput.paymentMethod,
						paymentCount: result.paymentIds.length,
					};
					await recordAssistantActivity({
						schoolId: ctx.schoolId,
						userId: ctx.userId,
						userName: ctx.userName,
						type: "assistant_action_completed",
						title: "AI recorded student payment",
						description: `${actionInput.studentName} payment recorded.`,
						meta: { toolName: "receiveStudentPayment", actionInput, output },
					});
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "completed",
						output,
					});
					return output;
				} catch (error) {
					await finishAssistantToolExecution({
						toolExecutionId: guarded.executionId,
						status: "failed",
						error:
							error instanceof Error
								? error.message
								: "Payment recording failed",
					});
					throw error;
				}
			},
		}),
	};
}
