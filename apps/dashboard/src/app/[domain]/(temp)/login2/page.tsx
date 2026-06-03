import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/login",
		noIndex: true,
	});
}
export default async function Login() {
	return <>LOGIN @@@@</>;
}
