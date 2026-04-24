import {
  getAssistantConversation,
  getAssistantSessionContext,
  saveAssistantMessage,
} from "@/lib/assistant/server";
import { assistantMessagePartSchema } from "@/lib/assistant/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

const saveMessageSchema = z.object({
  role: z.enum(["assistant", "system"]),
  content: z.string(),
  parts: z.array(assistantMessagePartSchema),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || !context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const conversation = await getAssistantConversation({
    conversationId,
    schoolId: context.schoolId,
    userId: context.userId,
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = saveMessageSchema.parse(await req.json());
  const message = await saveAssistantMessage({
    conversationId,
    schoolId: context.schoolId,
    userId: context.userId,
    role: body.role,
    content: body.content,
    parts: body.parts,
  });

  return NextResponse.json({ message });
}
