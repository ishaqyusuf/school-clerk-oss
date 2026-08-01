import { resolveDashboardNavigation } from "@/features/navigation/dashboard-navigation";

export function getFirstPermittedHref({
	can,
	role,
}: {
	can?: Record<string, boolean>;
	role?: string | null;
	userId?: string | null;
}) {
	return resolveDashboardNavigation(role, { permissions: can }).defaultHref;
}
