export function normalizeHost(host: string) {
  return host.trim().toLowerCase();
}

function stripPort(host: string) {
  return host.replace(/:\d+$/, "");
}

export function extractTenantSubdomain(host: string, appRootDomain: string) {
  const normalizedHost = normalizeHost(host);
  const normalizedRootDomain = normalizeHost(appRootDomain);

  if (!normalizedHost || !normalizedRootDomain) {
    return "";
  }

  const hostCandidates = [normalizedHost, stripPort(normalizedHost)];
  const rootCandidates = [
    normalizedRootDomain,
    stripPort(normalizedRootDomain),
  ];

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

/**
 * Strips the "dashboard." prefix from a raw subdomain string.
 * "dashboard.daarulhadith" → "daarulhadith"
 * "daarulhadith"           → "daarulhadith" (no-op)
 * ""                       → ""             (no-op)
 */
export function stripDashboardPrefix(subdomain: string): string {
  if (subdomain.startsWith(DASHBOARD_SUBDOMAIN_PREFIX)) {
    return subdomain.slice(DASHBOARD_SUBDOMAIN_PREFIX.length);
  }
  return subdomain;
}
