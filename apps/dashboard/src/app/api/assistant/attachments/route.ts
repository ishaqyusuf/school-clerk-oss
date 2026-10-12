import {
	readBoundedBody,
	AssistantUploadError,
	hasAssistantRequestOrigin,
} from "@/lib/assistant/request";
import { assistantRequestContext } from "@/lib/assistant/context";
import { resolveAssistantActor } from "@api/assistant/actor";
import { withAssistantConversationAccess, Prisma } from "@school-clerk/db";
import {
	validateAssistantFile,
	ASSISTANT_FILE_LIMIT,
} from "@school-clerk/ai/contracts/attachments";
export async function POST(request: Request) {
	try {
		if (!hasAssistantRequestOrigin(request))
			return Response.json({ error: "Invalid origin" }, { status: 403 });
		if (
			Number(request.headers.get("content-length") ?? 0) >
			ASSISTANT_FILE_LIMIT + 20000
		)
			return Response.json({ error: "File exceeds 2 MB" }, { status: 413 });
		const ctx = await assistantRequestContext();
		const actor = await resolveAssistantActor(ctx);
		const body = await readBoundedBody(request, ASSISTANT_FILE_LIMIT + 20000);
		const form = await new Response(body, {
			headers: { "Content-Type": request.headers.get("content-type") ?? "" },
		}).formData();
		const file = form.get("file");
		const conversationId = form.get("conversationId");
		if (!(file instanceof File) || typeof conversationId !== "string")
			return Response.json(
				{ error: "Choose a file and conversation." },
				{ status: 400 },
			);
		const bytes = new Uint8Array(await file.arrayBuffer());
		const mediaType =
			file.type || (/\.csv$/i.test(file.name) ? "text/csv" : "text/plain");
		try {
			validateAssistantFile(bytes, mediaType);
		} catch (error) {
			throw new AssistantUploadError(
				error instanceof Error ? error.message : "Unsupported file.",
			);
		}
		const attachment = await withAssistantConversationAccess(
			ctx.db,
			{ ...actor, conversationId },
			async (tx) => {
				await tx.$queryRaw(
					Prisma.sql`SELECT "id" FROM "SchoolAssistantConfig" WHERE "schoolProfileId"=${actor.schoolId} FOR UPDATE`,
				);
				const usage = await tx.assistantAttachment.aggregate({
					where: {
						schoolProfileId: actor.schoolId,
						userId: actor.userId,
						deletedAt: null,
					},
					_sum: { size: true },
				});
				if ((usage._sum.size ?? 0) + file.size > 20 * 1024 * 1024)
					throw new AssistantUploadError(
						"Your attachment storage limit is 20 MB. Remove older attachments before uploading more.",
					);
				return tx.assistantAttachment.create({
					data: {
						schoolProfileId: actor.schoolId,
						userId: actor.userId,
						conversationId,
						name: file.name.slice(0, 160),
						mediaType,
						size: bytes.length,
						bytes,
						text: mediaType.startsWith("text/")
							? new TextDecoder().decode(bytes)
							: undefined,
					},
					select: { id: true, name: true, size: true, mediaType: true },
				});
			},
		);
		if (!attachment)
			return Response.json(
				{ error: "Conversation unavailable" },
				{ status: 404 },
			);
		return Response.json(attachment, {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch (error) {
		return Response.json(
			{
				error:
					error instanceof AssistantUploadError
						? error.message
						: "Upload unavailable. Check school access and try again.",
			},
			{ status: 400 },
		);
	}
}
