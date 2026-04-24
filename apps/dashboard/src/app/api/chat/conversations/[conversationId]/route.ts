import {
  getAssistantConversation,
  getAssistantSessionContext,
} from "@/lib/assistant/server";
import { safeJsonParse } from "@/lib/assistant/shared";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
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

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      locale: conversation.locale,
      summary: conversation.summary,
      lastMessageAt: conversation.lastMessageAt,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: safeJsonParse(message.parts, []),
        content: message.content,
        createdAt: message.createdAt,
      })),
      runs: conversation.runs.map((run) => ({
        id: run.id,
        status: run.status,
        requestType: run.requestType,
        promptSummary: run.promptSummary,
        provider: run.provider,
        model: run.model,
        error: run.error,
        createdAt: run.createdAt,
        toolExecutions: run.toolExecutions.map((tool) => ({
          id: tool.id,
          toolName: tool.toolName,
          status: tool.status,
          isMutation: tool.isMutation,
          capability: tool.capability,
          createdAt: tool.createdAt,
        })),
      })),
    },
  });
}
