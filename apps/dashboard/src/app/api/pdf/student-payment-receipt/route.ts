import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json(
		{
			success: false,
			message: "Student payment receipts are unavailable while finance is being rebuilt.",
		},
		{ status: 503 },
	);
}
