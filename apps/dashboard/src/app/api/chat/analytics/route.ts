import {
  getAssistantAnalytics,
  getAssistantHistoryContext,
} from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAssistantHistoryContext();
  if (context instanceof Response) return context;
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = context.config;
  if (!config.analyticsEnabled) {
    return NextResponse.json({ error: "Analytics disabled" }, { status: 403 });
  }

  const analytics = await getAssistantAnalytics({
    schoolId: context.schoolId,
    userId: context.userId,
    availableTools: context.availableTools,
  });

  return NextResponse.json({ analytics }, { headers: { "Cache-Control": "private, no-store" } });
}
