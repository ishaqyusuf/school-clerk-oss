import { assistantRequestContext } from "@/lib/assistant/context";
import { resolveAssistantActor } from "@api/assistant/actor";
import { getAssistantRunReceipts } from "@school-clerk/db";

export async function GET(
	_request: Request, { params }: { params: Promise<{ runId: string }> },
) {
  const ctx = await assistantRequestContext();
	const actor = await resolveAssistantActor(ctx);
  const result = await getAssistantRunReceipts(ctx.db, {
		...actor,
		runId: (await params).runId,
    toolNames: actor.availableTools,
  });
	return Response.json(result ?? { error: "Not found" }, { status: result ? 200 : 404,
		headers: { "Cache-Control": "private, no-store" },
	});
}
