export function normalizeHost(host: string) {
  return host.trim().toLowerCase();
}

export function stripPort(host: string) {
  return host.replace(/:\d+$/, "");
}

function getRootDomainCandidates(appRootDomain: string) {
  const normalizedRootDomain = normalizeHost(appRootDomain);
  const rootCandidates = new Set<string>([
    normalizedRootDomain,
    stripPort(normalizedRootDomain),
  ]);

  // Support plain localhost dev hosts in addition to the portless pattern.
  if (normalizedRootDomain.includes(".localhost")) {
    rootCandidates.add("localhost");
  }

  return [...rootCandidates].filter(Boolean);
}

export function extractTenantSubdomain(host: string, appRootDomain: string) {
  const normalizedHost = normalizeHost(host);
  const rootCandidates = getRootDomainCandidates(appRootDomain);

  if (!normalizedHost || rootCandidates.length === 0) {
    return "";
  }

  const hostCandidates = [normalizedHost, stripPort(normalizedHost)];

  for (const candidateHost of hostCandidates) {
    for (const candidateRoot of rootCandidates) {
      if (!candidateRoot) continue;
      if (candidateHost === candidateRoot) return "";

      const rootSuffix = `.${candidateRoot}`;
      if (candidateHost.endsWith(rootSuffix)) {
        return candidateHost.slice(0, -rootSuffix.length);
      }
    }
  }

  return "";
}

export const DASHBOARD_SUBDOMAIN_PREFIX = "dashboard.";
export const DASHBOARD_SUBDOMAIN_SUFFIX = ".dashboard";

/**
 * Strips the "dashboard." prefix from a raw subdomain string.
 * "dashboard.daarulhadith" → "daarulhadith"
 * "daarulhadith"           → "daarulhadith" (no-op)
 * ""                       → ""             (no-op)
 */
export function stripDashboardPrefix(subdomain: string): string {
  let normalizedSubdomain = subdomain;

  if (normalizedSubdomain.startsWith(DASHBOARD_SUBDOMAIN_PREFIX)) {
    normalizedSubdomain = normalizedSubdomain.slice(
      DASHBOARD_SUBDOMAIN_PREFIX.length,
    );
  }

  if (normalizedSubdomain.endsWith(DASHBOARD_SUBDOMAIN_SUFFIX)) {
    normalizedSubdomain = normalizedSubdomain.slice(
      0,
      -DASHBOARD_SUBDOMAIN_SUFFIX.length,
    );
  }

  return normalizedSubdomain;
}

export function getCustomDomainLookupHost(host: string) {
  const normalizedHost = stripPort(normalizeHost(host));

  if (normalizedHost.startsWith(DASHBOARD_SUBDOMAIN_PREFIX)) {
    return normalizedHost.slice(DASHBOARD_SUBDOMAIN_PREFIX.length);
  }

  return normalizedHost;
}

export function getCanonicalTenantSlugFromHost(
  host: string,
  appRootDomain: string,
) {
  return stripDashboardPrefix(extractTenantSubdomain(host, appRootDomain));
}
