import type { AuthCookie } from "@/utils/workspace-cookie";

export class WorkspaceProfileError extends Error {
	constructor(public readonly status: number) {
		super(
			status === 401
				? "Your session has ended. Please sign in again."
				: "Unable to load your school workspace.",
		);
	}
}

// Only concurrent reads share a promise; completed identity/term results are never cached here.
export function createWorkspaceProfileLoader(fetcher: typeof fetch = fetch) {
	let pending: Promise<AuthCookie> | undefined;
	return function loadWorkspaceProfile(): Promise<AuthCookie> {
		if (pending) return pending;
		pending = (async () => {
			const response = await fetcher("/api/profile", {
				cache: "no-store",
				signal: AbortSignal.timeout(8_000),
			});
			if (!response.ok) throw new WorkspaceProfileError(response.status);
			return response.json() as Promise<AuthCookie>;
		})().finally(() => {
			pending = undefined;
		});
		return pending;
	};
}

export const loadWorkspaceProfile = createWorkspaceProfileLoader();
