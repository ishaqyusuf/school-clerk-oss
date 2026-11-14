import {
	getTenantUrlHeaderNames,
	resolveTenantUrlContext,
} from "@school-clerk/tenant-url";
import { getPerformanceRequestId } from "@school-clerk/utils/server-performance";
import { type NextRequest, NextResponse } from "next/server";
import { getDashboardTenantUrlConfig } from "./tenant-url-config";

export function getDashboardRoutingContext(
	request: NextRequest,
	config = getDashboardTenantUrlConfig(),
) {
	const forwardedHost = request.headers.get("x-forwarded-host");
	return resolveTenantUrlContext(
		{
			host: forwardedHost?.split(",")[0]?.trim() || request.headers.get("host"),
			pathname: request.nextUrl.pathname,
			protocol: request.headers.get("x-forwarded-proto"),
		},
		config,
	);
}

export function createDashboardRoutingHeaders(
	request: NextRequest,
	requestId: string,
	context: ReturnType<typeof getDashboardRoutingContext>,
	names: ReturnType<typeof getTenantUrlHeaderNames>,
) {
	const headers = new Headers(request.headers);
	for (const name of [
		"x-user-id",
		"x-session-token",
		"x-tenant-hostname",
		"x-tenant-subdomain",
		names.domain,
		names.accountId,
	]) {
		headers.delete(name);
	}

	headers.set("x-request-id", getPerformanceRequestId(requestId));
	headers.set("x-pathname", context.productPath);
	headers.set(names.pathname, context.productPath);
	headers.set(names.urlStyle, context.style);
	headers.set(names.externalBasePath, context.externalBasePath);
	headers.set(names.externalPath, context.externalPath);
	if (context.style === "custom-domain" && context.customDomainLookupHost) {
		headers.set("x-tenant-hostname", context.customDomainLookupHost);
	}
	return headers;
}

export function resolveDashboardRootRouting(
	request: NextRequest,
	requestId: string,
	context: ReturnType<typeof getDashboardRoutingContext>,
	config: ReturnType<typeof getDashboardTenantUrlConfig>,
) {
	if (!context.isAppRootHost || context.tenantSlug) return null;
	if (context.productPath !== "/sign-up") {
		return NextResponse.redirect(new URL("/sign-up", request.url));
	}
	return NextResponse.next({
		request: {
			headers: createDashboardRoutingHeaders(
				request,
				requestId,
				context,
				getTenantUrlHeaderNames(config),
			),
		},
	});
}
