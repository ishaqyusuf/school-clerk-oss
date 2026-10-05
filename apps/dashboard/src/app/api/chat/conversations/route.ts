import {
  createAssistantConversation,
  getAssistantHistoryContext,
  listAssistantConversations,
} from "@/lib/assistant/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createConversationSchema = z.object({ title: z.string().max(120).optional(), locale: z.string().min(2).max(12).optional() });

export async function GET() {
  const context = await getAssistantHistoryContext();
  if (context instanceof Response) return context;
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { config, capabilities, availableTools } = context;
  const conversations = await listAssistantConversations({
    schoolId: context.schoolId,
    userId: context.userId,
    availableTools,
  });

  return NextResponse.json({
    conversations,
    capabilities,
    availableTools,
    historyNotice: "Only conversations covered by your current tool permissions are shown. Older unclassified conversations remain stored for review.",
    config: {
      enabled: config.enabled,
      feedbackEnabled: config.feedbackEnabled,
      analyticsEnabled: config.analyticsEnabled,
      rolloutStage: config.rolloutStage,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  const context = await getAssistantHistoryContext();
  if (context instanceof Response) return context;
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createConversationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation details." }, { status: 400 });
  const body = parsed.data;
  const conversation = await createAssistantConversation({
    schoolId: context.schoolId,
    userId: context.userId,
    availableTools: context.availableTools,
    title: body.title,
    locale: body.locale,
  });

  return NextResponse.json({ conversation });
}
