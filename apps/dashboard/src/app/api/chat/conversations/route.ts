import {
  createAssistantConversation,
  ensureAssistantConfig,
  getAllowedCapabilities,
  getAssistantSessionContext,
  listAssistantConversations,
} from "@/lib/assistant/server";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureAssistantConfig(context.schoolId);
  const conversations = await listAssistantConversations({
    schoolId: context.schoolId,
    userId: context.userId,
  });

  return NextResponse.json({
    conversations,
    capabilities: getAllowedCapabilities({ role: context.role, config }),
    config: {
      enabled: config.enabled,
      feedbackEnabled: config.feedbackEnabled,
      analyticsEnabled: config.analyticsEnabled,
      rolloutStage: config.rolloutStage,
    },
  });
}

export async function POST(req: Request) {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { title?: string; locale?: string };
  const conversation = await createAssistantConversation({
    schoolId: context.schoolId,
    userId: context.userId,
    title: body.title,
    locale: body.locale,
  });

  return NextResponse.json({ conversation });
}
