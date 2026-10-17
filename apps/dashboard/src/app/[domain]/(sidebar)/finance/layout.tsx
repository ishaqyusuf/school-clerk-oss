import { FinanceModuleOff } from "@/components/finance/finance-module-off";
import { getServerWorkspace as getAuthCookie } from "@/trpc/request-context";
import { getQueryClient, trpc } from "@/trpc/server";
import type { ReactNode } from "react";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
	const cookie = await getAuthCookie();
	if (!cookie?.schoolId) return children;

	// Shares the request's query client with the sidebar layout's prefetch.
	const modules = await getQueryClient()
		.fetchQuery(
			trpc.schoolSettings.getModules.queryOptions({ schoolId: cookie.schoolId }),
		)
		.catch(() => null);
	const access = modules?.access;
	if (
		access?.status === "configured" &&
		!access.effectiveModules.includes("BILLING_FINANCE")
	) {
		return (
			<FinanceModuleOff
				entitled={Boolean(access.config?.entitledModules.includes("BILLING_FINANCE"))}
			/>
		);
	}
	return children;
}
