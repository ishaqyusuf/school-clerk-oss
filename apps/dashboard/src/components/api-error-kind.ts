/**
 * Classify a failure caught by a dashboard error boundary so the screen can
 * say what actually happened. Most failures are tRPC client errors carrying
 * `data.code`; server-render errors only carry a message.
 */
export type DashboardErrorKind =
	| "forbidden"
	| "unauthorized"
	| "not_found"
	| "network"
	| "unknown";

function readCode(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	const record = error as Record<string, unknown>;
	const data = (record.data ?? (record.shape as Record<string, unknown> | undefined)?.data) as
		| Record<string, unknown>
		| undefined;
	const code = data?.code ?? record.code;
	return typeof code === "string" ? code : null;
}

export function readErrorMessage(error: unknown): string {
	if (!error) return "";
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		return typeof message === "string" ? message : "";
	}
	return "";
}

export function classifyDashboardError(error: unknown): DashboardErrorKind {
	switch (readCode(error)) {
		case "FORBIDDEN":
			return "forbidden";
		case "UNAUTHORIZED":
			return "unauthorized";
		case "NOT_FOUND":
			return "not_found";
	}
	const message = readErrorMessage(error);
	if (/forbidden|requires .*access|not allowed|permission|only .*can/i.test(message))
		return "forbidden";
	if (/unauthori[sz]ed|session (has )?expired|not signed in|sign in again/i.test(message))
		return "unauthorized";
	if (/not found/i.test(message)) return "not_found";
	if (/failed to fetch|fetch failed|network|ECONNREFUSED|timed? ?out/i.test(message))
		return "network";
	return "unknown";
}
