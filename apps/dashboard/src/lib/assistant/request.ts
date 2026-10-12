export class AssistantUploadError extends Error {}

export function hasAssistantRequestOrigin(request: Request) {
	const origin = request.headers.get("origin");
	if (!origin) return true;
	try {
		const url = new URL(origin);
		// Match the public host used by tenant routing behind Portless/Vercel.
		const host =
			request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
			request.headers.get("host") ||
			new URL(request.url).host;
		return (
			url.protocol === "https:" && url.origin === origin && url.host === host
		);
	} catch {
		return false;
	}
}
export async function readBoundedBody(request: Request, limit: number) {
	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > limit) {
				await reader.cancel();
				throw new AssistantUploadError("Request exceeds the allowed size.");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.length;
	}
	return body;
}
