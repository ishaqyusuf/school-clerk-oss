export const ASSISTANT_FILE_LIMIT = 2 * 1024 * 1024;
export function validateAssistantFile(bytes: Uint8Array, mediaType: string) {
	if (!bytes.length || bytes.length > ASSISTANT_FILE_LIMIT)
		throw new Error("Choose a non-empty file up to 2 MB.");
	const prefix = Array.from(bytes.slice(0, 8));
	if (
		mediaType === "application/pdf" &&
		new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
	)
		return;
	if (
		mediaType === "image/png" &&
		prefix.join(",") === "137,80,78,71,13,10,26,10"
	)
		return;
	if (
		mediaType === "image/jpeg" &&
		prefix[0] === 255 &&
		prefix[1] === 216 &&
		prefix[2] === 255
	)
		return;
	if (["text/plain", "text/csv"].includes(mediaType) && !bytes.includes(0)) {
		new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		return;
	}
	throw new Error("Use a valid PDF, PNG, JPEG, UTF-8 text or CSV file.");
}
