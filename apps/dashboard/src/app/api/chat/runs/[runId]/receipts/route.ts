import { getAllowedCapabilities, getAssistantSessionContext } from "@/lib/assistant/server";
import { getSchoolAiAvailableToolNames } from "@school-clerk/ai";
import { getAssistantRunReceipts, prisma } from "@school-clerk/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const context = await getAssistantSessionContext();
  if (context instanceof Response) return context;
  const { runId } = await params;
  const config = await prisma.schoolAssistantConfig.findFirst({
    where: { schoolProfileId: context.schoolId, deletedAt: null },
  });
  if (!config?.enabled) return NextResponse.json({ error: "AI access is unavailable." }, { status: 403 });
  const capabilities = getAllowedCapabilities({ role: context.role, config, moduleAccess: context.moduleAccess });
  const result = await getAssistantRunReceipts(prisma, {
    runId, schoolId: context.schoolId, userId: context.userId,
    toolNames: getSchoolAiAvailableToolNames(context.moduleAccess, capabilities),
  });
  if (!result) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
