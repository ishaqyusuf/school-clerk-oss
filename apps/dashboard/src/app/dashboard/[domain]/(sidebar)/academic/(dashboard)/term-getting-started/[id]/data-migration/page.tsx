import { ConfigureTermImport } from "@/components/configure-term-import";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/academic/term-getting-started/current/data-migration",
	});
}

export default async function Page({ params }) {
	const termId = (await params)?.id as string;
	return (
		<div className="flex flex-col gap-6">
			<PageTitle>Data Migration</PageTitle>
			<ConfigureTermImport termId={termId} />
		</div>
	);
}
