import {
  ensureAssistantConfig,
  getAssistantSessionContext,
  saveAssistantFeedback,
} from "@/lib/assistant/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  conversationId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureAssistantConfig(context.schoolId);
  if (!config.feedbackEnabled) {
    return NextResponse.json({ error: "Feedback disabled" }, { status: 403 });
  }

  const body = feedbackSchema.parse(await req.json());
  const feedback = await saveAssistantFeedback({
    schoolId: context.schoolId,
    userId: context.userId,
    conversationId: body.conversationId ?? null,
    runId: body.runId ?? null,
    rating: body.rating ?? null,
    comment: body.comment ?? null,
    meta: body.meta,
  });

  return NextResponse.json({ feedback });
}
