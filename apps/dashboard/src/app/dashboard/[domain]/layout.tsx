import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { headers } from "next/headers";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	const requestHeaders = await headers();
	const pathname = requestHeaders.get("x-school-clerk-pathname");
	const host = requestHeaders.get("host");
	const protocol =
		requestHeaders.get("x-forwarded-proto") ||
		(process.env.NODE_ENV === "production" ? "https" : "http");

	return buildTenantPageMetadata({
		domain,
		pathname,
		host,
		protocol,
	});
}

export default async function DomainLayout({ children }) {
	return children;
}
