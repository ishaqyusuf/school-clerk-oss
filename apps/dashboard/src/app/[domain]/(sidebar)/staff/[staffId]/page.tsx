import { StaffOverviewPageClient } from "@/components/staff/staff-overview-page-client";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";

type Props = {
	params: Promise<{
		staffId: string;
	}>;
};

export default async function Page(props: Props) {
	const { staffId } = await props.params;

	await batchPrefetch([
		trpc.staff.getFormData.queryOptions({
			staffId,
		}),
	]);

	return (
		<HydrateClient>
			<StaffOverviewPageClient staffId={staffId} />
		</HydrateClient>
	);
}
