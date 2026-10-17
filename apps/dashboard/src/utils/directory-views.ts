import "server-only";

import { cookies } from "next/headers";
import {
	type DirectoryPageId,
	type DirectoryView,
	getDirectoryViewCookie,
	parseSavedDirectoryView,
} from "./directory-view-settings";

export async function getInitialDirectoryView(
	pageId: DirectoryPageId,
): Promise<DirectoryView | null> {
	const value = (await cookies()).get(getDirectoryViewCookie(pageId))?.value;
	return parseSavedDirectoryView(value);
}
