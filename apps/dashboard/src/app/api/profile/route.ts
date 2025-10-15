import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profile = await getAuthCookie();
    return NextResponse.json(profile ?? {});
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
