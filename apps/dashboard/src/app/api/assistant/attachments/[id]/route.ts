import { assistantRequestContext } from "@/lib/assistant/context";
import { hasAssistantRequestOrigin } from "@/lib/assistant/request";
import { resolveAssistantActor } from "@api/assistant/actor";
import { readConversation } from "@school-clerk/db/assistant";
async function owned(id: string) {
	const ctx = await assistantRequestContext();
	const actor = await resolveAssistantActor(ctx);
	const file = await ctx.db.assistantAttachment.findFirst({
		where: {
			id,
			schoolProfileId: actor.schoolId,
			userId: actor.userId,
			deletedAt: null,
		},
	});
	if (!file || !(await readConversation(ctx.db, actor, file.conversationId)))
		return null;
	return { ctx, file };
}
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const value = await owned((await params).id);
	if (!value?.file.bytes) return new Response("Not found", { status: 404 });
	return new Response(new Uint8Array(value.file.bytes), {
		headers: {
			"Content-Type": value.file.mediaType,
			"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(value.file.name)}`,
			"Cache-Control": "private, no-store",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	if (!hasAssistantRequestOrigin(request))
		return new Response(null, { status: 403 });
	const value = await owned((await params).id);
	if (!value) return new Response(null, { status: 404 });
	await value.ctx.db.assistantAttachment.update({
		where: { id: value.file.id },
		data: { deletedAt: new Date(), bytes: null, text: null },
	});
	return Response.json({ ok: true });
}
