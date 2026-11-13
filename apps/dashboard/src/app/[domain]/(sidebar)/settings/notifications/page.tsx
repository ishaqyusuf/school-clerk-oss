import { getSession } from "@/auth/server";
import { ActivityNotificationSettings } from "@/components/settings/activity-notifications/activity-notification-settings";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Notification settings",
};

export default async function Page() {
	const session = await getSession();
	const role =
		(session?.user as { role?: string | null } | undefined)?.role ?? null;
	// The API (`activity.rules.*`) enforces the same admin check.
	const canManage = role?.trim().toLowerCase() === "admin";
	if (canManage) {
		prefetch(trpc.activity.rules.list.queryOptions());
		prefetch(trpc.activity.rules.options.queryOptions());
	}

	return (
		<HydrateClient>
			<PageTitle>Notification settings</PageTitle>
			<ActivityNotificationSettings canManage={canManage} />
		</HydrateClient>
	);
}
