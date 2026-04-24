import {
  assistantMessagesToUiMessages,
  buildConfirmationToken,
  completeAssistantRun,
  createAssistantRun,
  createAssistantToolExecution,
  ensureAssistantConfig,
  finishAssistantToolExecution,
  getAllowedCapabilities,
  getAssistantConversation,
  getAssistantSessionContext,
  inputToUserMessage,
  isCapabilityAllowed,
  parseIncomingChatInput,
  readConfirmationToken,
  recordAssistantActivity,
  saveAssistantMessage,
} from "@/lib/assistant/server";
import { assistantCapabilityMap } from "@/lib/assistant/shared";
import { getTeacherWorkspaceAction } from "@/actions/get-teacher-workspace";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { convertToModelMessages, streamText, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const inventoryModel = prisma.inventory as any;
const inventoryIssuanceModel = prisma.inventoryIssuance as any;

function studentDisplayName(s: {
  name?: string | null;
  otherName?: string | null;
  surname?: string | null;
}) {
  return [s.name, s.otherName, s.surname].filter(Boolean).join(" ");
}

function getModelSelection(config: {
  preferredProvider?: string | null;
  preferredModel?: string | null;
}) {
  const provider = config.preferredProvider || process.env.AI_PROVIDER || "anthropic";

  if (provider === "openai") {
    const modelName = config.preferredModel || "gpt-4o";
    return { provider, modelName, model: openai(modelName) };
  }

  if (provider === "gemini") {
    const modelName = config.preferredModel || "gemini-2.0-flash";
    return { provider, modelName, model: google(modelName) };
  }

  const modelName = config.preferredModel || "claude-sonnet-4-6";
  return { provider: "anthropic", modelName, model: anthropic(modelName) };
}

type AssistantRouteContext = {
  conversationId: string;
  schoolId: string;
  sessionId: string | null;
  termId: string | null;
  userId: string;
  role: string | null;
  userName: string;
  config: Awaited<ReturnType<typeof ensureAssistantConfig>>;
  runId: string;
};

function requiresConfirmationResult(params: {
  ctx: AssistantRouteContext;
  toolName: string;
  summary: string;
  actionInput: Record<string, unknown>;
}) {
  return {
    requiresConfirmation: true,
    toolName: params.toolName,
    summary: params.summary,
    confirmationToken: buildConfirmationToken({
      conversationId: params.ctx.conversationId,
      schoolId: params.ctx.schoolId,
      toolName: params.toolName,
      actionInput: params.actionInput,
    }),
    actionInput: params.actionInput,
  };
}

function isConfirmedMutation(params: {
  ctx: AssistantRouteContext;
  toolName: string;
  confirmationToken?: string;
  actionInput: Record<string, unknown>;
}) {
  if (!params.confirmationToken) return false;
  const decoded = readConfirmationToken(params.confirmationToken);
  if (!decoded) return false;

  return (
    decoded.conversationId === params.ctx.conversationId &&
    decoded.schoolId === params.ctx.schoolId &&
    decoded.toolName === params.toolName &&
    JSON.stringify(decoded.actionInput) === JSON.stringify(params.actionInput)
  );
}

function buildTools(ctx: AssistantRouteContext) {
  const guardCapability = async (
    capability: keyof typeof assistantCapabilityMap,
    toolName: string,
    input: unknown,
    isMutation: boolean,
  ) => {
    const execution = await createAssistantToolExecution({
      runId: ctx.runId,
      conversationId: ctx.conversationId,
      schoolId: ctx.schoolId,
      toolName,
      capability,
      isMutation,
      input,
    });

    if (!isCapabilityAllowed({ role: ctx.role, config: ctx.config, capability })) {
      const output = {
        blocked: true,
        toolName,
        message: "This action is not available for your current role or assistant settings.",
      };
      await finishAssistantToolExecution({
        toolExecutionId: execution.id,
        status: "blocked",
        output,
      });
      return { executionId: execution.id, blocked: output };
    }

    return { executionId: execution.id, blocked: null };
  };

  return {
    searchStudents: tool({
      description:
        "Search for students by name. Returns matching students and current-term enrollment/payment context.",
      inputSchema: z.object({
        query: z.string().describe("Student name or partial name"),
      }),
      execute: async ({ query }) => {
        const guarded = await guardCapability("students.read", "searchStudents", { query }, false);
        if (guarded.blocked) return guarded.blocked;

        try {
          const students = await prisma.students.findMany({
            where: {
              schoolProfileId: ctx.schoolId,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { surname: { contains: query, mode: "insensitive" } },
                { otherName: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 8,
            orderBy: [{ name: "asc" }, { surname: "asc" }],
            select: {
              id: true,
              name: true,
              surname: true,
              otherName: true,
              termForms: {
                where: { sessionTermId: ctx.termId, deletedAt: null },
                take: 1,
                select: {
                  id: true,
                  classroomDepartment: {
                    select: {
                      departmentName: true,
                      classRoom: { select: { name: true } },
                    },
                  },
                  studentFees: {
                    where: { deletedAt: null, status: { not: "cancelled" } },
                    select: { pendingAmount: true },
                  },
                },
              },
            },
          });

          const output = students.map((s) => {
            const termForm = s.termForms[0] ?? null;
            const classroom = termForm?.classroomDepartment
              ? classroomDisplayName({
                  className: termForm.classroomDepartment.classRoom?.name,
                  departmentName: termForm.classroomDepartment.departmentName,
                })
              : null;

            return {
              id: s.id,
              fullName: studentDisplayName(s),
              classroom,
              termFormId: termForm?.id ?? null,
              totalPending:
                termForm?.studentFees.reduce((sum, fee) => sum + (fee.pendingAmount ?? 0), 0) ?? 0,
              isEnrolledThisTerm: !!termForm,
            };
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
            error: error instanceof Error ? error.message : "Student search failed",
          });
          throw error;
        }
      },
    }),

    listClassrooms: tool({
      description: "List available classrooms for the active academic session.",
      inputSchema: z.object({}),
      execute: async () => {
        const guarded = await guardCapability(
          "students.enrollment",
          "listClassrooms",
          {},
          false,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          const departments = await prisma.classRoomDepartment.findMany({
            where: {
              deletedAt: null,
              classRoom: {
                schoolProfileId: ctx.schoolId,
                schoolSessionId: ctx.sessionId ?? undefined,
              },
            },
            select: {
              id: true,
              departmentName: true,
              departmentLevel: true,
              classRoom: {
                select: {
                  id: true,
                  name: true,
                  classLevel: true,
                  session: { select: { id: true } },
                },
              },
            },
            orderBy: [
              { classRoom: { classLevel: "asc" } },
              { departmentLevel: "asc" },
              { departmentName: "asc" },
            ],
          });

          const output = departments.map((department) => ({
            id: department.id,
            displayName: classroomDisplayName({
              className: department.classRoom?.name,
              departmentName: department.departmentName,
            }),
            className: department.classRoom?.name ?? null,
            streamName: department.departmentName,
            sessionId: department.classRoom?.session?.id ?? null,
          }));

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
            error: error instanceof Error ? error.message : "Classroom lookup failed",
          });
          throw error;
        }
      },
    }),

    enrollStudent: tool({
      description:
        "Enroll a student into a classroom for the active term. Requires explicit confirmation.",
      inputSchema: z.object({
        studentId: z.string(),
        studentName: z.string(),
        classroomDepartmentId: z.string(),
        classroomName: z.string(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({
        confirmationToken,
        ...actionInput
      }: {
        studentId: string;
        studentName: string;
        classroomDepartmentId: string;
        classroomName: string;
        confirmationToken?: string;
      }) => {
        const guarded = await guardCapability(
          "students.enrollment",
          "enrollStudent",
          actionInput,
          true,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          if (
            !isConfirmedMutation({
              ctx,
              toolName: "enrollStudent",
              confirmationToken,
              actionInput,
            })
          ) {
            const output = requiresConfirmationResult({
              ctx,
              toolName: "enrollStudent",
              summary: `Enroll ${actionInput.studentName} into ${actionInput.classroomName}?`,
              actionInput,
            });
            await recordAssistantActivity({
              schoolId: ctx.schoolId,
              userId: ctx.userId,
              userName: ctx.userName,
              type: "assistant_action_requested",
              title: "Assistant enrollment confirmation requested",
              description: output.summary,
              meta: { toolName: "enrollStudent", actionInput },
            });
            await finishAssistantToolExecution({
              toolExecutionId: guarded.executionId,
              status: "blocked",
              output,
            });
            return output;
          }

          const existing = await prisma.studentTermForm.findFirst({
            where: {
              studentId: actionInput.studentId,
              sessionTermId: ctx.termId,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.studentTermForm.update({
              where: { id: existing.id },
              data: { classroomDepartmentId: actionInput.classroomDepartmentId },
            });

            const output = {
              success: true,
              action: "updated",
              studentName: actionInput.studentName,
              classroomName: actionInput.classroomName,
            };
            await recordAssistantActivity({
              schoolId: ctx.schoolId,
              userId: ctx.userId,
              userName: ctx.userName,
              type: "assistant_action_completed",
              title: "Assistant updated student enrollment",
              description: `${actionInput.studentName} moved to ${actionInput.classroomName}.`,
              meta: { toolName: "enrollStudent", actionInput, output },
            });
            await finishAssistantToolExecution({
              toolExecutionId: guarded.executionId,
              status: "completed",
              output,
            });
            return output;
          }

          let sessionForm = await prisma.studentSessionForm.findFirst({
            where: {
              studentId: actionInput.studentId,
              schoolSessionId: ctx.sessionId ?? undefined,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!sessionForm) {
            sessionForm = await prisma.studentSessionForm.create({
              data: {
                schoolProfileId: ctx.schoolId,
                schoolSessionId: ctx.sessionId ?? undefined,
                studentId: actionInput.studentId,
                classroomDepartmentId: actionInput.classroomDepartmentId,
              },
              select: { id: true },
            });
          }

          await prisma.studentTermForm.create({
            data: {
              classroomDepartmentId: actionInput.classroomDepartmentId,
              schoolSessionId: ctx.sessionId ?? undefined,
              studentId: actionInput.studentId,
              sessionTermId: ctx.termId ?? undefined,
              schoolProfileId: ctx.schoolId,
              studentSessionFormId: sessionForm.id,
            },
          });

          const output = {
            success: true,
            action: "enrolled",
            studentName: actionInput.studentName,
            classroomName: actionInput.classroomName,
          };
          await recordAssistantActivity({
            schoolId: ctx.schoolId,
            userId: ctx.userId,
            userName: ctx.userName,
            type: "assistant_action_completed",
            title: "Assistant enrolled student",
            description: `${actionInput.studentName} enrolled into ${actionInput.classroomName}.`,
            meta: { toolName: "enrollStudent", actionInput, output },
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
            error: error instanceof Error ? error.message : "Enrollment failed",
          });
          throw error;
        }
      },
    }),

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
          const fees = await prisma.studentFee.findMany({
            where: {
              studentTermFormId,
              deletedAt: null,
              status: { not: "cancelled" },
            },
            select: {
              id: true,
              feeTitle: true,
              description: true,
              billAmount: true,
              pendingAmount: true,
              feeHistory: { select: { wallet: { select: { id: true, name: true } } } },
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
            fees: fees.map((fee) => {
              const paidAmount = (fee.billAmount ?? 0) - (fee.pendingAmount ?? 0);
              const status =
                (fee.pendingAmount ?? 0) <= 0
                  ? ("PAID" as const)
                  : (fee.pendingAmount ?? 0) < (fee.billAmount ?? 0)
                    ? ("PARTIAL" as const)
                    : ("PENDING" as const);

              return {
                id: fee.id,
                title: fee.feeTitle ?? "Fee",
                description: fee.description,
                billAmount: fee.billAmount ?? 0,
                paidAmount,
                pendingAmount: fee.pendingAmount ?? 0,
                status,
                streamName: fee.feeHistory?.wallet?.name ?? null,
              };
            }),
            totalPending: fees.reduce((sum, fee) => sum + (fee.pendingAmount ?? 0), 0),
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
            error: error instanceof Error ? error.message : "Payment lookup failed",
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
              title: "Assistant payment confirmation requested",
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
              const fee = await tx.studentFee.findFirstOrThrow({
                where: {
                  id: allocation.studentFeeId,
                  studentTermFormId: termForm.id,
                  deletedAt: null,
                  status: { not: "cancelled" },
                },
                select: {
                  id: true,
                  feeTitle: true,
                  pendingAmount: true,
                  feeHistory: { select: { walletId: true } },
                },
              });

              if ((fee.pendingAmount ?? 0) < allocation.amountToPay) {
                throw new Error(
                  `Cannot allocate more than the remaining balance for ${allocation.feeTitle}.`,
                );
              }

              const walletId =
                fee.feeHistory?.walletId ||
                (
                  await tx.wallet.upsert({
                    where: {
                      name_schoolProfileId_sessionTermId_type: {
                        name: fee.feeTitle || "General",
                        schoolProfileId: ctx.schoolId,
                        sessionTermId: ctx.termId ?? "",
                        type: "fee",
                      },
                    },
                    update: {},
                    create: {
                      name: fee.feeTitle || "General",
                      type: "fee",
                      schoolProfileId: ctx.schoolId,
                      sessionTermId: ctx.termId ?? "",
                    },
                    select: { id: true },
                  })
                ).id;

              const walletTx = await tx.walletTransactions.create({
                data: {
                  amount: allocation.amountToPay,
                  walletId,
                  type: "credit",
                  status: "success",
                  transactionDate: new Date(),
                  summary: actionInput.paymentMethod,
                  studentWalletTransaction: {
                    create: {
                      studentId: actionInput.studentId,
                      amount: allocation.amountToPay,
                      transactionType: "debit",
                      status: "success",
                      description: fee.feeTitle || "Fee payment",
                      transactionDate: new Date(),
                    },
                  },
                },
                select: { id: true },
              });

              const payment = await tx.studentPayment.create({
                data: {
                  type: "FEE",
                  paymentType: fee.feeTitle || "Fee",
                  amount: allocation.amountToPay,
                  status: "success",
                  description: actionInput.paymentMethod,
                  schoolProfileId: ctx.schoolId,
                  studentTermFormId: termForm.id,
                  studentBillPaymentsId: fee.id,
                  walletTransactionsId: walletTx.id,
                },
                select: { id: true },
              });

              await tx.studentFee.update({
                where: { id: fee.id },
                data: { pendingAmount: { decrement: allocation.amountToPay } },
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
            title: "Assistant recorded student payment",
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
            error: error instanceof Error ? error.message : "Payment recording failed",
          });
          throw error;
        }
      },
    }),

    searchInventoryItems: tool({
      description: "Search inventory items such as books, supplies, equipment, and uniforms.",
      inputSchema: z.object({
        query: z.string(),
        type: z.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"]).optional(),
        lowStockOnly: z.boolean().optional().default(false),
      }),
      execute: async ({ query, type, lowStockOnly }) => {
        const guarded = await guardCapability(
          "inventory.read",
          "searchInventoryItems",
          { query, type, lowStockOnly },
          false,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          const items = await inventoryModel.findMany({
            where: {
              schoolProfileId: ctx.schoolId,
              ...(type ? { type } : {}),
              ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
            },
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              quantity: true,
              unitPrice: true,
              lowStockAlert: true,
              issuances: { where: { deletedAt: null }, select: { quantity: true } },
            },
            orderBy: { title: "asc" },
            take: 10,
          });

          const output = items
            .map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              type: item.type,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              isLowStock: item.quantity <= item.lowStockAlert,
              totalIssued: item.issuances.reduce((sum, issuance) => sum + issuance.quantity, 0),
            }))
            .filter((item) => (lowStockOnly ? item.isLowStock : true));

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
            error: error instanceof Error ? error.message : "Inventory search failed",
          });
          throw error;
        }
      },
    }),

    createInventoryItem: tool({
      description: "Create a new inventory item. Requires explicit confirmation.",
      inputSchema: z.object({
        title: z.string(),
        type: z.enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"]).default("OTHER"),
        quantity: z.number().int().min(0).default(1),
        unitPrice: z.number().min(0).default(0),
        description: z.string().optional(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({
        confirmationToken,
        ...actionInput
      }: {
        title: string;
        type: "SUPPLY" | "TEXTBOOK" | "EQUIPMENT" | "UNIFORM" | "OTHER";
        quantity: number;
        unitPrice: number;
        description?: string;
        confirmationToken?: string;
      }) => {
        const guarded = await guardCapability(
          "inventory.write",
          "createInventoryItem",
          actionInput,
          true,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          if (
            !isConfirmedMutation({
              ctx,
              toolName: "createInventoryItem",
              confirmationToken,
              actionInput,
            })
          ) {
            const output = requiresConfirmationResult({
              ctx,
              toolName: "createInventoryItem",
              summary: `Create inventory item ${actionInput.title} with quantity ${actionInput.quantity}?`,
              actionInput,
            });
            await recordAssistantActivity({
              schoolId: ctx.schoolId,
              userId: ctx.userId,
              userName: ctx.userName,
              type: "assistant_action_requested",
              title: "Assistant inventory creation confirmation requested",
              description: output.summary,
              meta: { toolName: "createInventoryItem", actionInput },
            });
            await finishAssistantToolExecution({
              toolExecutionId: guarded.executionId,
              status: "blocked",
              output,
            });
            return output;
          }

          const item = await inventoryModel.create({
            data: {
              title: actionInput.title,
              type: actionInput.type,
              quantity: actionInput.quantity,
              unitPrice: actionInput.unitPrice,
              description: actionInput.description ?? null,
              schoolProfileId: ctx.schoolId,
              lowStockAlert: 5,
            },
            select: {
              id: true,
              title: true,
              quantity: true,
              unitPrice: true,
              type: true,
            },
          });

          const output = { ...item, created: true };
          await recordAssistantActivity({
            schoolId: ctx.schoolId,
            userId: ctx.userId,
            userName: ctx.userName,
            type: "assistant_action_completed",
            title: "Assistant created inventory item",
            description: `${actionInput.title} was created in inventory.`,
            meta: { toolName: "createInventoryItem", actionInput, output },
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
            error: error instanceof Error ? error.message : "Inventory creation failed",
          });
          throw error;
        }
      },
    }),

    recordInventoryIssuance: tool({
      description: "Record that an inventory item was issued. Requires explicit confirmation.",
      inputSchema: z.object({
        inventoryId: z.string(),
        itemTitle: z.string(),
        quantity: z.number().int().positive().default(1),
        issuedTo: z.string().optional(),
        note: z.string().optional(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({
        confirmationToken,
        ...actionInput
      }: {
        inventoryId: string;
        itemTitle: string;
        quantity: number;
        issuedTo?: string;
        note?: string;
        confirmationToken?: string;
      }) => {
        const guarded = await guardCapability(
          "inventory.write",
          "recordInventoryIssuance",
          actionInput,
          true,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          if (
            !isConfirmedMutation({
              ctx,
              toolName: "recordInventoryIssuance",
              confirmationToken,
              actionInput,
            })
          ) {
            const output = requiresConfirmationResult({
              ctx,
              toolName: "recordInventoryIssuance",
              summary: `Issue ${actionInput.quantity} x ${actionInput.itemTitle}?`,
              actionInput,
            });
            await recordAssistantActivity({
              schoolId: ctx.schoolId,
              userId: ctx.userId,
              userName: ctx.userName,
              type: "assistant_action_requested",
              title: "Assistant inventory issuance confirmation requested",
              description: output.summary,
              meta: { toolName: "recordInventoryIssuance", actionInput },
            });
            await finishAssistantToolExecution({
              toolExecutionId: guarded.executionId,
              status: "blocked",
              output,
            });
            return output;
          }

          const item = await inventoryModel.findFirstOrThrow({
            where: { id: actionInput.inventoryId, schoolProfileId: ctx.schoolId, deletedAt: null },
            select: { id: true, quantity: true },
          });

          if (item.quantity < actionInput.quantity) {
            const output = {
              blocked: true,
              toolName: "recordInventoryIssuance",
              message: `Not enough stock. Available: ${item.quantity}, requested: ${actionInput.quantity}.`,
            };
            await recordAssistantActivity({
              schoolId: ctx.schoolId,
              userId: ctx.userId,
              userName: ctx.userName,
              type: "assistant_action_blocked",
              title: "Assistant inventory issuance blocked",
              description: output.message,
              meta: { toolName: "recordInventoryIssuance", actionInput },
            });
            await finishAssistantToolExecution({
              toolExecutionId: guarded.executionId,
              status: "blocked",
              output,
            });
            return output;
          }

          await prisma.$transaction([
            inventoryIssuanceModel.create({
              data: {
                inventoryId: actionInput.inventoryId,
                quantity: actionInput.quantity,
                issuedTo: actionInput.issuedTo ?? null,
                note: actionInput.note ?? null,
                issuedDate: new Date(),
                schoolProfileId: ctx.schoolId,
              },
            }),
            inventoryModel.update({
              where: { id: actionInput.inventoryId },
              data: { quantity: { decrement: actionInput.quantity } },
            }),
          ]);

          const output = { success: true, ...actionInput };
          await recordAssistantActivity({
            schoolId: ctx.schoolId,
            userId: ctx.userId,
            userName: ctx.userName,
            type: "assistant_action_completed",
            title: "Assistant recorded inventory issuance",
            description: `${actionInput.quantity} x ${actionInput.itemTitle} issued.`,
            meta: { toolName: "recordInventoryIssuance", actionInput, output },
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
            error: error instanceof Error ? error.message : "Inventory issuance failed",
          });
          throw error;
        }
      },
    }),

    searchStaffMembers: tool({
      description: "Search staff members by name, title, email, or phone.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const guarded = await guardCapability("staff.read", "searchStaffMembers", { query }, false);
        if (guarded.blocked) return guarded.blocked;

        try {
          const staff = await prisma.staffProfile.findMany({
            where: {
              schoolProfileId: ctx.schoolId,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { title: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 8,
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              title: true,
              email: true,
              phone: true,
              classRoomAttendanceList: {
                select: { id: true },
              },
              termProfiles: {
                where: { sessionTermId: ctx.termId ?? undefined, deletedAt: null },
                select: {
                  classroomsProfiles: { select: { id: true } },
                },
              },
            },
          });

          const output = staff.map((item) => ({
            id: item.id,
            name: item.name,
            title: item.title,
            email: item.email,
            phone: item.phone,
            attendanceSessions: item.classRoomAttendanceList.length,
            assignedClassrooms: item.termProfiles[0]?.classroomsProfiles.length ?? 0,
          }));

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
            error: error instanceof Error ? error.message : "Staff search failed",
          });
          throw error;
        }
      },
    }),

    getTeacherWorkspaceSummary: tool({
      description: "Get the current teacher workspace summary for the signed-in teacher.",
      inputSchema: z.object({}),
      execute: async () => {
        const guarded = await guardCapability(
          "staff.read",
          "getTeacherWorkspaceSummary",
          {},
          false,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          const workspace = await getTeacherWorkspaceAction();
          await finishAssistantToolExecution({
            toolExecutionId: guarded.executionId,
            status: "completed",
            output: workspace,
          });
          return workspace;
        } catch (error) {
          await finishAssistantToolExecution({
            toolExecutionId: guarded.executionId,
            status: "failed",
            error:
              error instanceof Error ? error.message : "Teacher workspace lookup failed",
          });
          throw error;
        }
      },
    }),

    getStudentAttendanceHistory: tool({
      description: "Get recent attendance history for a student in the active term.",
      inputSchema: z.object({
        studentId: z.string(),
      }),
      execute: async ({ studentId }) => {
        const guarded = await guardCapability(
          "attendance.read",
          "getStudentAttendanceHistory",
          { studentId },
          false,
        );
        if (guarded.blocked) return guarded.blocked;

        try {
          const student = await prisma.students.findFirst({
            where: { id: studentId, schoolProfileId: ctx.schoolId },
            select: {
              id: true,
              name: true,
              surname: true,
              otherName: true,
              termForms: {
                where: { sessionTermId: ctx.termId ?? undefined },
                take: 1,
                select: {
                  id: true,
                  attendanceList: {
                    take: 12,
                    orderBy: { createdAt: "desc" },
                    select: {
                      id: true,
                      isPresent: true,
                      comment: true,
                      createdAt: true,
                      classroomAttendance: {
                        select: { attendanceTitle: true },
                      },
                      department: {
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
          });

          const termForm = student?.termForms[0];
          const output = {
            studentId,
            studentName: student ? studentDisplayName(student) : "Student",
            records:
              termForm?.attendanceList.map((record) => ({
                id: record.id,
                isPresent: record.isPresent,
                comment: record.comment,
                createdAt: record.createdAt,
                attendanceTitle: record.classroomAttendance?.attendanceTitle ?? null,
                classroom: classroomDisplayName({
                  className: record.department?.classRoom?.name,
                  departmentName: record.department?.departmentName,
                }),
              })) ?? [],
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
              error instanceof Error ? error.message : "Attendance history lookup failed",
          });
          throw error;
        }
      },
    }),

    searchGuardians: tool({
      description: "Search guardians/parents by name or phone number.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const guarded = await guardCapability("parents.read", "searchGuardians", { query }, false);
        if (guarded.blocked) return guarded.blocked;

        try {
          const guardians = await prisma.guardians.findMany({
            where: {
              schoolProfileId: ctx.schoolId,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { phone2: { contains: query, mode: "insensitive" } },
              ],
            },
            take: 10,
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              phone: true,
              phone2: true,
              wards: {
                select: {
                  relation: true,
                  student: {
                    select: {
                      id: true,
                      name: true,
                      surname: true,
                      otherName: true,
                    },
                  },
                },
              },
            },
          });

          const output = guardians.map((guardian) => ({
            id: guardian.id,
            name: guardian.name,
            phone: guardian.phone,
            phone2: guardian.phone2,
            wards: guardian.wards.map((ward) => ({
              relation: ward.relation,
              studentId: ward.student?.id ?? null,
              studentName: ward.student ? studentDisplayName(ward.student) : null,
            })),
          }));

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
            error: error instanceof Error ? error.message : "Guardian search failed",
          });
          throw error;
        }
      },
    }),
  };
}

function buildSystemPrompt(input: {
  role: string | null;
  allowedCapabilities: string[];
  extra?: string | null;
}) {
  return `You are a tenant-aware School Clerk assistant helping school staff complete operational tasks.

Rules:
- Always respond in the same language the user uses. Support Arabic and English.
- Never invent IDs, names, balances, classrooms, or payment amounts. Use tools.
- Keep responses concise, operational, and easy to act on.
- For ambiguous search results, present the options and wait for the user selection.
- For mutation tools, if the tool output requests confirmation, explain what will happen and wait for explicit confirmation from the user.
- Do not suggest tools or actions outside the allowed capability list.
- Current user role: ${input.role ?? "unknown"}.
- Allowed capabilities: ${input.allowedCapabilities.join(", ") || "none"}.

${input.extra ?? ""}`.trim();
}

export async function POST(req: Request) {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureAssistantConfig(context.schoolId);
  const allowedCapabilities = getAllowedCapabilities({
    role: context.role,
    config,
  });

  if (!config.enabled) {
    return NextResponse.json({ error: "Assistant is disabled for this school." }, { status: 403 });
  }

  if (!allowedCapabilities.length) {
    return NextResponse.json(
      { error: "Assistant access is not available for your current role." },
      { status: 403 },
    );
  }

  const body = (await req.json()) as {
    conversationId?: string;
    input?: unknown;
  };

  if (!body.conversationId || !body.input) {
    return NextResponse.json({ error: "conversationId and input are required." }, { status: 400 });
  }

  const conversation = await getAssistantConversation({
    conversationId: body.conversationId,
    schoolId: context.schoolId,
    userId: context.userId,
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const parsedInput = parseIncomingChatInput(body.input);
  const userMessage = inputToUserMessage(parsedInput);

  const savedUserMessage = await saveAssistantMessage({
    conversationId: conversation.id,
    schoolId: context.schoolId,
    userId: context.userId,
    role: "user",
    content: userMessage.content,
    parts: [{ type: "text", text: userMessage.content, state: "done" }],
    workflowState: parsedInput.kind === "workflow" ? parsedInput.action : null,
  });

  const { provider, modelName, model } = getModelSelection({
    preferredProvider: config.preferredProvider,
    preferredModel: config.preferredModel,
  });

  const run = await createAssistantRun({
    conversationId: conversation.id,
    schoolId: context.schoolId,
    userId: context.userId,
    provider,
    model: modelName,
    requestType: parsedInput.kind,
    promptSummary: userMessage.content.slice(0, 240),
    locale: userMessage.locale,
    workflowAction: parsedInput.kind === "workflow" ? parsedInput.action : null,
  });

  await recordAssistantActivity({
    schoolId: context.schoolId,
    userId: context.userId,
    userName: context.userName,
    type: "assistant_run",
    title: "Assistant run started",
    description: userMessage.content.slice(0, 160),
    meta: {
      conversationId: conversation.id,
      runId: run.id,
      requestType: parsedInput.kind,
      role: context.role,
    },
  });

  const routeContext: AssistantRouteContext = {
    conversationId: conversation.id,
    schoolId: context.schoolId,
    sessionId: context.sessionId,
    termId: context.termId,
    userId: context.userId,
    role: context.role,
    userName: context.userName,
    config,
    runId: run.id,
  };

  const tools = buildTools(routeContext);
  const historyMessages = assistantMessagesToUiMessages([
    ...conversation.messages,
    savedUserMessage,
  ]);
  const modelMessages = await convertToModelMessages(historyMessages as any, { tools });

  const result = streamText({
    model,
    system: buildSystemPrompt({
      role: context.role,
      allowedCapabilities,
      extra: config.systemPromptExtra,
    }),
    messages: modelMessages,
    tools,
    onFinish: async ({ usage, finishReason, response, text }) => {
      await completeAssistantRun({
        runId: run.id,
        status: finishReason === "error" ? "failed" : "completed",
        usage: usage
          ? {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              totalTokens: usage.totalTokens,
            }
          : null,
        metrics: {
          finishReason,
          responseMessages: response?.messages?.length ?? 0,
          assistantTextLength: text?.length ?? 0,
        },
      });
    },
    onError: async ({ error }) => {
      await completeAssistantRun({
        runId: run.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Assistant run failed",
      });
    },
  });

  const response = result.toUIMessageStreamResponse();
  response.headers.set("x-school-clerk-conversation-id", conversation.id);
  response.headers.set("x-school-clerk-run-id", run.id);
  response.headers.set("x-school-clerk-provider", provider);
  response.headers.set("x-school-clerk-model", modelName);
  return response;
}
