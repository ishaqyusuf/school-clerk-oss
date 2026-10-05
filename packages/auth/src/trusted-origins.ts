import { hasActiveAuthTenantSlug, hasVerifiedAuthCustomDomain, prisma } from "@school-clerk/db";
import { parseAuthOrigin } from "./configuration";

function tenantSlugForRoot(candidate: URL, root: URL) {
  if (candidate.protocol !== root.protocol || candidate.port !== root.port) return null;
  const roots = [root.hostname, ...(root.hostname.startsWith("dashboard.") ? [root.hostname.slice(10)] : [])];
  for (const hostname of roots) {
    if (!candidate.hostname.endsWith(`.${hostname}`)) continue;
    const prefix = candidate.hostname.slice(0, -(hostname.length + 1));
    const slug = prefix.startsWith("dashboard.") ? prefix.slice(10) : prefix;
    if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return slug;
  }
  return null;
}

export function createAuthOriginPolicy(options: { baseUrl: string; productionUrl: string }) {
  const roots = [options.baseUrl, options.productionUrl].map((value) => {
    const parsed = parseAuthOrigin(value);
    if (!parsed) throw new Error("Auth requires explicitly configured HTTPS application origins.");
    return parsed;
  });
  const configured = [...new Set(roots.map((root) => root.origin))];
  const isTrusted = async (value: string) => {
    const origin = parseAuthOrigin(value);
    if (!origin || value !== origin.origin) return false;
    if (configured.includes(origin.origin)) return true;
    for (const root of roots) {
      const slug = tenantSlugForRoot(origin, root);
      if (slug && await hasActiveAuthTenantSlug(prisma, slug)) return true;
    }
    if (origin.port) return false;
    return hasVerifiedAuthCustomDomain(prisma, origin.hostname);
  };
  const trustedOrigins = async (request?: Request) => {
    const origins = new Set(configured);
    const suppliedOrigin = request?.headers.get("origin");
    if (suppliedOrigin && await isTrusted(suppliedOrigin)) origins.add(new URL(suppliedOrigin).origin);
    const referer = request?.headers.get("referer");
    if (!suppliedOrigin && referer) {
      let source: URL | null = null;
      try { source = new URL(referer); } catch { /* Invalid referers grant no trust. */ }
      if (source && await isTrusted(source.origin)) origins.add(source.origin);
    }
    if (request) {
      const destination = new URL(request.url).origin;
      if (await isTrusted(destination)) origins.add(destination);
    }
    return [...origins];
  };
  return { isTrusted, trustedOrigins };
}
