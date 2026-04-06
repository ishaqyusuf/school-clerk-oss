import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { Client } from "./client";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/login",
		noIndex: true,
	});
}
export default async function Page() {
	return <Client />;
}
