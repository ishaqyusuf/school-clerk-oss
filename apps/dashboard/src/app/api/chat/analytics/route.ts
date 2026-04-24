import {
  ensureAssistantConfig,
  getAssistantAnalytics,
  getAssistantSessionContext,
} from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureAssistantConfig(context.schoolId);
  if (!config.analyticsEnabled) {
    return NextResponse.json({ error: "Analytics disabled" }, { status: 403 });
  }

  const analytics = await getAssistantAnalytics({
    schoolId: context.schoolId,
    userId: context.userId,
  });

  return NextResponse.json({ analytics });
}
