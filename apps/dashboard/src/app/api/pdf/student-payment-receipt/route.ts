import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { prisma } from "@school-clerk/db";
import { renderToStream } from "@school-clerk/pdf";
import { PaymentReceiptTemplate } from "@school-clerk/pdf/payment-receipt-template";
import { format } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	paymentIds: z
		.string()
		.min(1)
		.transform((value) =>
			Array.from(
				new Set(
					value
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean),
				),
			),
		),
	download: z.preprocess(
		(value) => value === "true",
		z.boolean().default(false),
	),
});

const getStudentName = (student: {
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
}) =>
	[student.name, student.otherName, student.surname].filter(Boolean).join(" ");

const getClassroomName = (
	department?: {
		departmentName?: string | null;
		classRoom?: { name?: string | null } | null;
	} | null,
) => {
	if (!department) return null;
	return [department.classRoom?.name, department.departmentName]
		.filter(Boolean)
		.join(" ");
};

export async function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const parsed = paramsSchema.safeParse(
		Object.fromEntries(requestUrl.searchParams.entries()),
	);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid receipt request." },
			{ status: 400 },
		);
	}

	const auth = await getAuthCookie();
	if (!auth.schoolId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payments = await prisma.studentPayment.findMany({
		where: {
			id: { in: parsed.data.paymentIds },
			schoolProfileId: auth.schoolId,
		},
		select: {
			id: true,
			amount: true,
			description: true,
			paymentType: true,
			studentFee: {
				select: {
					feeTitle: true,
					description: true,
				},
			},
			walletTransaction: {
				select: {
					transactionDate: true,
				},
			},
			schoolProfile: {
				select: {
					name: true,
				},
			},
			studentTermForm: {
				select: {
					sessionTerm: {
						select: {
							title: true,
							session: {
								select: {
									title: true,
								},
							},
						},
					},
					classroomDepartment: {
						select: {
							departmentName: true,
							classRoom: {
								select: {
									name: true,
								},
							},
						},
					},
					student: {
						select: {
							name: true,
							surname: true,
							otherName: true,
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	if (!payments.length) {
		return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
	}

	const firstPayment = payments[0];
	const [paymentMethod, reference] = (firstPayment.description || "")
		.split(" • ")
		.map((part) => part.trim());
	const paymentDate =
		firstPayment.walletTransaction?.transactionDate || new Date();
	const studentName = getStudentName(firstPayment.studentTermForm.student);
	const classroom = getClassroomName(
		firstPayment.studentTermForm.classroomDepartment,
	);
	const term = [
		firstPayment.studentTermForm.sessionTerm?.title,
		firstPayment.studentTermForm.sessionTerm?.session?.title,
	]
		.filter(Boolean)
		.join(" • ");
	const totalAmount = payments.reduce(
		(sum, payment) => sum + Number(payment.amount || 0),
		0,
	);

	const document = PaymentReceiptTemplate({
		schoolName: firstPayment.schoolProfile.name,
		studentName,
		classroom,
		term,
		paymentDate: format(new Date(paymentDate), "dd MMM yyyy"),
		reference: reference || null,
		paymentMethod: paymentMethod || null,
		totalAmount,
		lines: payments.map((payment) => ({
			title:
				payment.studentFee?.feeTitle ||
				payment.paymentType ||
				"Student Payment",
			description: payment.studentFee?.description || null,
			amount: Number(payment.amount || 0),
		})),
	});

	try {
		const stream = await renderToStream(document);
		if (!stream) {
			return NextResponse.json(
				{ error: "Failed to render payment receipt." },
				{ status: 500 },
			);
		}

		const blob = await new Response(stream as BodyInit).blob();
		const safeStudentName = studentName
			.replace(/[^a-z0-9-_]+/gi, "-")
			.toLowerCase();
		const headers: Record<string, string> = {
			"Content-Type": "application/pdf",
			"Cache-Control": "no-store, max-age=0",
			"Content-Disposition": `${
				parsed.data.download ? "attachment" : "inline"
			}; filename="${safeStudentName || "student"}-payment-receipt.pdf"`,
		};

		return new Response(blob, { headers });
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unable to generate receipt.",
			},
			{ status: 500 },
		);
	}
}
