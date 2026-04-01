import { getFirstPermittedHref } from "@/components/sidebar/links";
import { getSession } from "@/auth/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function K12TeachersLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await getSession();
	const role = session?.user?.role ?? null;

	if (role !== "Teacher") {
		redirect(getFirstPermittedHref({ role }));
	}

	return children;
}
