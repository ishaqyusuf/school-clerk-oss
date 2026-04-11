import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { prisma } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Provider selection ────────────────────────────────────────────────────────

function getModel() {
  const provider = process.env.AI_PROVIDER ?? "anthropic";
  if (provider === "openai") return openai("gpt-4o");
  if (provider === "gemini") return google("gemini-2.0-flash");
  return anthropic("claude-sonnet-4-6");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function studentDisplayName(s: {
  name?: string | null;
  otherName?: string | null;
  surname?: string | null;
}) {
  return [s.name, s.otherName, s.surname].filter(Boolean).join(" ");
}

async function getOrCreateWallet(
  db: typeof prisma,
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

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful school administration assistant for School Clerk, a school management system.

You help administrators complete common tasks like:
- Enrolling students into classrooms
- Receiving fee payments from students
- Recording book purchases and inventory issuances
- Checking student balances and fee status

IMPORTANT RULES:
1. Always respond in the same language the user writes in (Arabic or English).
2. Always use the available tools to fetch real data — never invent IDs, names, or amounts.
3. For multi-step flows, guide the user one step at a time.
4. When searching for students, if you get multiple results, present them and ask which one.
5. If a student search returns exactly one result, proceed automatically.
6. Keep responses concise and action-oriented.
7. Format currency amounts clearly (e.g., ₦3,000).
8. After completing an action (enrollment, payment, issuance), confirm success clearly.`;

// ── Tool definitions ──────────────────────────────────────────────────────────

function buildTools(profile: { schoolId?: string; termId?: string; sessionId?: string }) {
  return {
    searchStudents: tool({
      description:
        "Search for students by name. Returns a list of matching students with their current classroom and fee summary.",
      parameters: z.object({
        query: z.string().describe("Student name or partial name to search for"),
      }),
      execute: async ({ query }) => {
        const students = await prisma.students.findMany({
          where: {
            schoolProfileId: profile.schoolId,
            deletedAt: null,
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
              where: { sessionTermId: profile.termId, deletedAt: null },
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

        return students.map((s) => {
          const termForm = s.termForms[0] ?? null;
          const classroom = termForm?.classroomDepartment
            ? classroomDisplayName({
                className: termForm.classroomDepartment.classRoom?.name,
                departmentName: termForm.classroomDepartment.departmentName,
              })
            : null;
          const totalPending = termForm?.studentFees.reduce(
            (sum, f) => sum + (f.pendingAmount ?? 0),
            0,
          );
          return {
            id: s.id,
            fullName: studentDisplayName(s),
            classroom,
            termFormId: termForm?.id ?? null,
            totalPending: totalPending ?? 0,
            isEnrolledThisTerm: !!termForm,
          };
        });
      },
    }),

    listClassrooms: tool({
      description:
        "List all available classrooms for the current academic session. Used when enrolling a student to show classroom options.",
      parameters: z.object({}),
      execute: async () => {
        const departments = await prisma.classRoomDepartment.findMany({
          where: {
            deletedAt: null,
            classRoom: {
              session: {
                id: profile.sessionId,
                schoolId: profile.schoolId,
              },
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

        return departments.map((d) => ({
          id: d.id,
          displayName: classroomDisplayName({
            className: d.classRoom?.name,
            departmentName: d.departmentName,
          }),
          className: d.classRoom?.name ?? null,
          streamName: d.departmentName,
          sessionId: d.classRoom?.session?.id ?? null,
        }));
      },
    }),

    enrollStudent: tool({
      description:
        "Enroll a student into a classroom for the current academic term. Creates a studentTermForm record.",
      parameters: z.object({
        studentId: z.string().describe("The student's ID"),
        studentName: z.string().describe("The student's full name for confirmation"),
        classroomDepartmentId: z
          .string()
          .describe("The classroom department ID to enroll into"),
        classroomName: z.string().describe("The classroom display name for confirmation"),
      }),
      execute: async ({ studentId, studentName, classroomDepartmentId, classroomName }) => {
        if (!profile.sessionId || !profile.termId || !profile.schoolId) {
          throw new Error("School session context is incomplete. Please refresh and try again.");
        }

        const existing = await prisma.studentTermForm.findFirst({
          where: { studentId, sessionTermId: profile.termId, deletedAt: null },
          select: { id: true },
        });

        if (existing) {
          await prisma.studentTermForm.update({
            where: { id: existing.id },
            data: { classroomDepartmentId },
          });
          return { success: true, action: "updated", studentName, classroomName };
        }

        let sessionForm = await prisma.studentSessionForm.findFirst({
          where: { studentId, schoolSessionId: profile.sessionId, deletedAt: null },
          select: { id: true },
        });

        if (!sessionForm) {
          sessionForm = await prisma.studentSessionForm.create({
            data: {
              schoolProfileId: profile.schoolId,
              schoolSessionId: profile.sessionId,
              studentId,
              classroomDepartmentId,
            },
            select: { id: true },
          });
        }

        await prisma.studentTermForm.create({
          data: {
            classroomDepartmentId,
            schoolSessionId: profile.sessionId,
            studentId,
            sessionTermId: profile.termId,
            schoolProfileId: profile.schoolId,
            studentSessionFormId: sessionForm.id,
          },
          select: { id: true },
        });

        return { success: true, action: "enrolled", studentName, classroomName };
      },
    }),

    getStudentPaymentData: tool({
      description:
        "Get a student's pending fees for the current term. Returns fee items the admin can select to receive payment against.",
      parameters: z.object({
        studentId: z.string().describe("The student's ID"),
        studentTermFormId: z.string().describe("The student's term form ID"),
      }),
      execute: async ({ studentId, studentTermFormId }) => {
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
          where: { id: studentId, schoolProfileId: profile.schoolId },
          select: { name: true, surname: true, otherName: true },
        });

        return {
          studentName: student ? studentDisplayName(student) : "Student",
          studentId,
          studentTermFormId,
          fees: fees.map((f) => {
            const paidAmount = (f.billAmount ?? 0) - (f.pendingAmount ?? 0);
            const status =
              (f.pendingAmount ?? 0) <= 0
                ? ("PAID" as const)
                : (f.pendingAmount ?? 0) < (f.billAmount ?? 0)
                  ? ("PARTIAL" as const)
                  : ("PENDING" as const);
            return {
              id: f.id,
              title: f.feeTitle ?? "Fee",
              description: f.description,
              billAmount: f.billAmount ?? 0,
              paidAmount,
              pendingAmount: f.pendingAmount ?? 0,
              status,
              streamName: f.feeHistory?.wallet?.name ?? null,
            };
          }),
          totalPending: fees.reduce((s, f) => s + (f.pendingAmount ?? 0), 0),
        };
      },
    }),

    receiveStudentPayment: tool({
      description:
        "Record a fee payment from a student. Provide the amount and which fees to allocate it against.",
      parameters: z.object({
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
      }),
      execute: async ({
        studentId,
        studentName,
        studentTermFormId,
        amountReceived,
        paymentMethod,
        allocations,
      }) => {
        if (!profile.schoolId || !profile.termId) {
          throw new Error("School context is incomplete.");
        }

        const result = await prisma.$transaction(async (tx) => {
          const termForm = await tx.studentTermForm.findFirstOrThrow({
            where: {
              id: studentTermFormId,
              studentId,
              schoolProfileId: profile.schoolId,
              deletedAt: null,
            },
            select: { id: true },
          });

          const paymentIds: string[] = [];

          for (const alloc of allocations) {
            const fee = await tx.studentFee.findFirstOrThrow({
              where: {
                id: alloc.studentFeeId,
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

            const walletId =
              fee.feeHistory?.walletId ||
              (
                await getOrCreateWallet(tx as unknown as typeof prisma, {
                  name: fee.feeTitle || "General",
                  type: "fee",
                  schoolId: profile.schoolId!,
                  termId: profile.termId!,
                })
              ).id;

            const walletTx = await tx.walletTransactions.create({
              data: {
                amount: alloc.amountToPay,
                walletId,
                type: "credit",
                status: "success",
                transactionDate: new Date(),
                summary: paymentMethod,
                studentWalletTransaction: {
                  create: {
                    studentId,
                    amount: alloc.amountToPay,
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
                amount: alloc.amountToPay,
                status: "success",
                description: paymentMethod,
                schoolProfileId: profile.schoolId!,
                studentTermFormId: termForm.id,
                studentBillPaymentsId: fee.id,
                walletTransactionsId: walletTx.id,
              },
              select: { id: true },
            });

            await tx.studentFee.update({
              where: { id: fee.id },
              data: { pendingAmount: { decrement: alloc.amountToPay } },
            });

            paymentIds.push(payment.id);
          }

          return { paymentIds };
        });

        return {
          success: true,
          studentName,
          amountReceived,
          paymentMethod,
          paymentCount: result.paymentIds.length,
        };
      },
    }),

    searchInventoryItems: tool({
      description: "Search inventory items (books, supplies, equipment) by name.",
      parameters: z.object({
        query: z.string().describe("Item name or keyword to search for"),
        type: z
          .enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
          .optional()
          .describe("Filter by item type"),
        lowStockOnly: z.boolean().optional().default(false),
      }),
      execute: async ({ query, type, lowStockOnly }) => {
        const items = await prisma.inventory.findMany({
          where: {
            schoolProfileId: profile.schoolId,
            deletedAt: null,
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

        const result = items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isLowStock: item.quantity <= item.lowStockAlert,
          totalIssued: item.issuances.reduce((s, i) => s + i.quantity, 0),
        }));

        if (lowStockOnly) return result.filter((i) => i.isLowStock);
        return result;
      },
    }),

    createInventoryItem: tool({
      description:
        "Create a new inventory item (book, supply, equipment, etc). Use this when the item doesn't exist yet.",
      parameters: z.object({
        title: z.string().describe("Item name"),
        type: z
          .enum(["SUPPLY", "TEXTBOOK", "EQUIPMENT", "UNIFORM", "OTHER"])
          .default("OTHER")
          .describe("Item category"),
        quantity: z.number().int().min(0).default(1),
        unitPrice: z.number().min(0).default(0),
        description: z.string().optional(),
      }),
      execute: async ({ title, type, quantity, unitPrice, description }) => {
        const item = await prisma.inventory.create({
          data: {
            title,
            type,
            quantity,
            unitPrice,
            description: description ?? null,
            schoolProfileId: profile.schoolId!,
            lowStockAlert: 5,
          },
          select: { id: true, title: true, quantity: true, unitPrice: true, type: true },
        });
        return { ...item, created: true };
      },
    }),

    recordInventoryIssuance: tool({
      description:
        "Record that an inventory item was issued/given to someone (e.g., a student collected a book).",
      parameters: z.object({
        inventoryId: z.string().describe("The inventory item ID"),
        itemTitle: z.string().describe("Item title for confirmation"),
        quantity: z.number().int().positive().default(1),
        issuedTo: z.string().optional().describe("Name of the person receiving the item"),
        note: z.string().optional().describe("Additional notes"),
      }),
      execute: async ({ inventoryId, itemTitle, quantity, issuedTo, note }) => {
        const item = await prisma.inventory.findFirstOrThrow({
          where: { id: inventoryId, schoolProfileId: profile.schoolId, deletedAt: null },
          select: { id: true, quantity: true },
        });

        if (item.quantity < quantity) {
          throw new Error(`Not enough stock. Available: ${item.quantity}, requested: ${quantity}.`);
        }

        await prisma.$transaction([
          prisma.inventoryIssuance.create({
            data: {
              inventoryId,
              quantity,
              issuedTo: issuedTo ?? null,
              note: note ?? null,
              issuedDate: new Date(),
              schoolProfileId: profile.schoolId!,
            },
          }),
          prisma.inventory.update({
            where: { id: inventoryId },
            data: { quantity: { decrement: quantity } },
          }),
        ]);

        return { success: true, itemTitle, quantity, issuedTo, note };
      },
    }),
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const cookie = await getAuthCookie();
  if (!cookie?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = {
    schoolId: cookie.schoolId,
    termId: cookie.termId,
    sessionId: cookie.sessionId,
  };

  const { messages } = await req.json();
  const tools = buildTools(profile);

  // Convert UIMessages from client to model messages
  const modelMessages = await convertToModelMessages(messages, { tools });

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    maxSteps: 5,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
