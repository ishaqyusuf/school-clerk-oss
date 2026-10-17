"use server";

import {
	directoryViewInputSchema,
	getDirectoryViewCookie,
} from "@/utils/directory-view-settings";
import { cookies } from "next/headers";
import type { z } from "zod";

export async function updateDirectoryViewAction(
	input: z.infer<typeof directoryViewInputSchema>,
) {
	const parsed = directoryViewInputSchema.safeParse(input);
	if (!parsed.success) return { error: "Invalid view preference." };
	(await cookies()).set(
		getDirectoryViewCookie(parsed.data.pageId),
		parsed.data.view,
		{
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
		},
	);
	return { error: null };
}
