import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profile = await getAuthCookie();
    if (!profile.auth.bearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(profile, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
