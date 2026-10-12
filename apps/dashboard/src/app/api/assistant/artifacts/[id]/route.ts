import { assistantRequestContext } from "@/lib/assistant/context";
import { resolveAssistantActor } from "@api/assistant/actor";
import { readConversation } from "@school-clerk/db/assistant";
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await assistantRequestContext();
	const actor = await resolveAssistantActor(ctx);
	const id = (await params).id;
	const artifact = await ctx.db.assistantArtifact.findFirst({
		where: {
			id,
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			status: "ready",
		},
	});
	if (
		!artifact?.bytes ||
		!(await readConversation(ctx.db, actor, artifact.conversationId))
	)
		return new Response("Unavailable", { status: 404 });
	return new Response(new Uint8Array(artifact.bytes), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="assistant-${artifact.id}.pdf"`,
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
