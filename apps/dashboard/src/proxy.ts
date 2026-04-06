import { prisma } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./auth/server";
import { getFirstPermittedHref } from "./components/sidebar/links";
import { env } from "./env";
import {
	getCanonicalTenantSlugFromHost,
	getCustomDomainLookupHost,
} from "./utils/tenant-host";

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};

export default async function proxy(req: NextRequest) {
	const hostName = resolveDashboardAppRootDomain(env.APP_ROOT_DOMAIN);
	if (!hostName) throw new Error("APP_ROOT_DOMAIN is not defined");

	const host = req.headers.get("host") ?? "";
	const url = req.nextUrl;

	// ---- Determine canonical slug ----
	let canonicalSlug = getCanonicalTenantSlugFromHost(host, hostName);

	if (!canonicalSlug) {
		const bareHost = getCustomDomainLookupHost(host);

		if (bareHost) {
			const record = await prisma.tenantDomain.findUnique({
				where: { customDomain: bareHost },
				select: { subdomain: true },
			});
			if (record?.subdomain) canonicalSlug = record.subdomain;
		}
	}
	// console.log({ canonicalSlug, host });
	const nextUrl = req.nextUrl;
	const pathnameLocale = nextUrl.pathname; //.split("/", 2)?.[1];
	// Remove the locale from the pathname
	const pathnameWithoutLocale = pathnameLocale;
	//  ? nextUrl.pathname.slice(pathnameLocale.length + 1)
	//  : nextUrl.pathname;
	// Create a new URL without the locale in the pathname
	const newUrl = new URL(pathnameWithoutLocale || "/", req.url);
	const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${
		newUrl.search
	}`;
	const isLogin = url.pathname === "/login";

	// ---- Handle special app subdomain ----
	if (canonicalSlug === "app" || canonicalSlug.startsWith("app.")) {
		return NextResponse.rewrite(new URL("/app/", req.url));
	}

	const session = await auth.api.getSession({
		headers: req.headers,
	});
	if (url.pathname === "/" || isLogin) {
		if (session) {
			const defaultLink = getFirstPermittedHref({
				role: session.user?.role,
			});
			console.log({ defaultLink });
			return NextResponse.redirect(new URL(defaultLink, req.url));
		}

		if (!isLogin) {
			const loginUrl = new URL("/login", req.url);

			if (encodedSearchParams) {
				loginUrl.searchParams.append("return_to", encodedSearchParams);
			}

			return NextResponse.redirect(loginUrl);
		}
	}

	if (
		!session &&
		!isLogin &&
		!url.pathname.includes("/student-report") &&
		!url.pathname.includes("/assessment-recording")
	) {
		// TODO: check if domain tenant exists, else redirect to tenant not found page

		const url = new URL("/login", req.url);

		if (encodedSearchParams) {
			url.searchParams.append("return_to", encodedSearchParams);
		}

		return NextResponse.redirect(url);
	}

	// ---- Rewrite to school dashboard route ----
	if (canonicalSlug) {
		const searchParams = url.searchParams.toString();
		const path = `${url.pathname}${searchParams ? `?${searchParams}` : ""}`;
		const requestHeaders = new Headers(req.headers);
		requestHeaders.set("x-school-clerk-pathname", url.pathname);

		let rewritePath = `/dashboard/${canonicalSlug}${path}`;

		// ✅ Always ensure it starts with a slash
		if (!rewritePath.startsWith("/")) rewritePath = `/${rewritePath}`;

		return NextResponse.rewrite(new URL(rewritePath, req.url), {
			request: {
				headers: requestHeaders,
			},
		});
	}

	// ---- Default: continue normally ----
	return NextResponse.next();
}
