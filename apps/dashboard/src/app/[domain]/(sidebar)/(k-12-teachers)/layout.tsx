import { getFirstPermittedHref } from "@/components/sidebar/links";
import { getSession } from "@/auth/server";
import { tenantRedirect } from "@/utils/tenant-redirect";
import type { ReactNode } from "react";

const teacherWorkspaceRoles = ["Teacher"] as const;

function isTeacherWorkspaceRole(
	role: unknown,
): role is (typeof teacherWorkspaceRoles)[number] {
	return (
		typeof role === "string" &&
		teacherWorkspaceRoles.includes(
			role as (typeof teacherWorkspaceRoles)[number],
		)
	);
}

export default async function K12TeachersLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await getSession();
	const role = session?.user?.role ?? null;

	if (!isTeacherWorkspaceRole(role)) {
		await tenantRedirect(getFirstPermittedHref({ role }));
	}

	return children;
}
