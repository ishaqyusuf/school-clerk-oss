import { getFirstPermittedHref } from "@/components/sidebar/links";
import { getSession } from "@/auth/server";
import { redirect } from "next/navigation";
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
		redirect(getFirstPermittedHref({ role }));
	}

	return children;
}
