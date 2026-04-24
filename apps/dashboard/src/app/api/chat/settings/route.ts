import {
  ensureAssistantConfig,
  getAssistantSessionContext,
} from "@/lib/assistant/server";
import { assistantCapabilities } from "@/lib/assistant/shared";
import { prisma } from "@school-clerk/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.object({
  enabled: z.boolean(),
  preferredProvider: z.string().nullable().optional(),
  preferredModel: z.string().nullable().optional(),
  allowedRoles: z.array(z.string()),
  enabledCapabilities: z.array(z.string()),
  disabledCapabilities: z.array(z.string()),
  analyticsEnabled: z.boolean(),
  feedbackEnabled: z.boolean(),
  maxSteps: z.number().int().min(1).max(8),
  systemPromptExtra: z.string().nullable().optional(),
  rolloutStage: z.string().nullable().optional(),
});

export async function GET() {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await ensureAssistantConfig(context.schoolId);
  return NextResponse.json({
    config,
    capabilities: assistantCapabilities,
  });
}

export async function POST(req: Request) {
  const context = await getAssistantSessionContext();
  if (!context?.schoolId || context.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = settingsSchema.parse(await req.json());
  const config = await prisma.schoolAssistantConfig.update({
    where: { schoolProfileId: context.schoolId },
    data: {
      enabled: body.enabled,
      preferredProvider: body.preferredProvider ?? null,
      preferredModel: body.preferredModel ?? null,
      allowedRoles: body.allowedRoles,
      enabledCapabilities: body.enabledCapabilities,
      disabledCapabilities: body.disabledCapabilities,
      analyticsEnabled: body.analyticsEnabled,
      feedbackEnabled: body.feedbackEnabled,
      maxSteps: body.maxSteps,
      systemPromptExtra: body.systemPromptExtra ?? null,
      rolloutStage: body.rolloutStage ?? null,
    },
  });

  return NextResponse.json({ config });
}
