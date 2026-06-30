export type RuntimeUrlKind =
  | "production-domain"
  | "vercel-preview"
  | "portless-local"
  | "localhost"
  | "lan-ip"
  | "unknown";

export type RuntimeUrlConfig = {
  appPort?: number | string | null;
  appRootDomain?: string | null;
  portlessRootDomain?: string | null;
  productionRootDomain?: string | null;
  publicUrl?: string | null;
  defaultProtocol?: "http" | "https";
  isProduction?: boolean;
};

export type ResolveAppUrlOptions = {
  currentUrl?: string | null;
  currentHost?: string | null;
  currentProtocol?: string | null;
  path?: string;
  config: RuntimeUrlConfig;
};

function normalizePath(path?: string) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function normalizeRuntimeHost(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `http://${trimmed}`,
    );
    return url.host.toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .toLowerCase();
  }
}

function normalizeProtocol(value?: string | null) {
  const protocol = value?.trim().replace(/:$/, "").toLowerCase();
  return protocol === "https" ? "https" : protocol === "http" ? "http" : "";
}

function stripPort(host: string) {
  if (host.startsWith("[")) return host.replace(/]:\d+$/, "]");
  return host.replace(/:\d+$/, "");
}

function normalizePortlessRootDomain(value?: string | null) {
  const host = normalizeRuntimeHost(value);
  return host ? stripPort(host) : "";
}

function getPort(host: string) {
  if (host.startsWith("[")) {
    return host.match(/]:(\d+)$/)?.[1] ?? "";
  }

  return host.match(/:(\d+)$/)?.[1] ?? "";
}

function getConfiguredPort(config: RuntimeUrlConfig) {
  const port = config.appPort?.toString().trim();
  return port && /^\d+$/.test(port) ? port : "";
}

function withConfiguredPort(host: string, config: RuntimeUrlConfig) {
  if (!host || getPort(host)) return host;

  const port = getConfiguredPort(config);
  return port ? `${host}:${port}` : host;
}

function getHostFromOptions(options: ResolveAppUrlOptions) {
  return normalizeRuntimeHost(options.currentHost ?? options.currentUrl);
}

function getRootCandidates(config: RuntimeUrlConfig) {
  const roots = [
    normalizePortlessRootDomain(config.portlessRootDomain),
    config.appRootDomain,
    config.productionRootDomain,
    normalizeRuntimeHost(config.publicUrl),
  ]
    .map((root) => normalizeRuntimeHost(root))
    .filter(Boolean);

  return Array.from(new Set(roots));
}

function hostMatchesRoot(host: string, root: string) {
  const hostCandidates = [host, stripPort(host)];
  const rootCandidates = [root, stripPort(root)];

  return hostCandidates.some((candidateHost) =>
    rootCandidates.some(
      (candidateRoot) =>
        candidateHost === candidateRoot ||
        candidateHost.endsWith(`.${candidateRoot}`),
    ),
  );
}

function isIpHost(host: string) {
  const bareHost = stripPort(host).replace(/^\[|\]$/g, "");
  const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(bareHost);
  const isIpv6 = bareHost.includes(":");

  return isIpv4 || isIpv6;
}

function isLocalhostHost(host: string) {
  const bareHost = stripPort(host);
  return bareHost === "localhost" || bareHost.endsWith(".localhost");
}

function isVercelPreviewHost(host: string) {
  return stripPort(host).endsWith(".vercel.app");
}

export function classifyRuntimeHost(
  host: string,
  config: RuntimeUrlConfig = {},
): RuntimeUrlKind {
  const normalizedHost = normalizeRuntimeHost(host);
  if (!normalizedHost) return "unknown";
  if (isIpHost(normalizedHost)) return "lan-ip";
  if (isVercelPreviewHost(normalizedHost)) return "vercel-preview";

  const portlessRoot = normalizePortlessRootDomain(config.portlessRootDomain);
  if (portlessRoot && hostMatchesRoot(normalizedHost, portlessRoot)) {
    return "portless-local";
  }

  if (isLocalhostHost(normalizedHost)) return "localhost";

  const productionRoot = normalizeRuntimeHost(config.productionRootDomain);
  if (productionRoot && hostMatchesRoot(normalizedHost, productionRoot)) {
    return "production-domain";
  }

  const appRoot = normalizeRuntimeHost(config.appRootDomain);
  if (appRoot && hostMatchesRoot(normalizedHost, appRoot)) {
    return config.isProduction ? "production-domain" : "portless-local";
  }

  return "unknown";
}

export function resolveRootHostFromCurrentHost(
  host: string,
  config: RuntimeUrlConfig,
) {
  const normalizedHost = normalizeRuntimeHost(host);
  if (!normalizedHost) {
    return (
      normalizeRuntimeHost(config.productionRootDomain) ||
      normalizeRuntimeHost(config.appRootDomain) ||
      normalizeRuntimeHost(config.publicUrl)
    );
  }

  if (isIpHost(normalizedHost) || isVercelPreviewHost(normalizedHost)) {
    return normalizedHost;
  }

  const portlessRoot = normalizePortlessRootDomain(config.portlessRootDomain);
  if (portlessRoot && hostMatchesRoot(normalizedHost, portlessRoot)) {
    return portlessRoot;
  }

  if (isLocalhostHost(normalizedHost)) {
    return withConfiguredPort("localhost", config) || normalizedHost;
  }

  for (const root of getRootCandidates(config)) {
    if (hostMatchesRoot(normalizedHost, root)) return root;
  }

  return (
    normalizeRuntimeHost(config.productionRootDomain) ||
    normalizeRuntimeHost(config.appRootDomain) ||
    normalizedHost
  );
}

export function buildRuntimeAppUrl(options: ResolveAppUrlOptions) {
  const host = getHostFromOptions(options);
  const resolvedHost = resolveRootHostFromCurrentHost(host, options.config);
  const kind = classifyRuntimeHost(resolvedHost, options.config);
  const requestProtocol = normalizeProtocol(options.currentProtocol);
  const protocol =
    kind === "production-domain" || kind === "vercel-preview"
      ? requestProtocol || "https"
      : kind === "portless-local"
        ? options.config.defaultProtocol ||
          (options.config.isProduction ? "https" : "http")
      : requestProtocol ||
        options.config.defaultProtocol ||
        (options.config.isProduction ? "https" : "http");

  if (!resolvedHost) return normalizePath(options.path) || "/";

  return `${protocol}://${resolvedHost}${normalizePath(options.path)}`;
}

export function buildSignupUrl(
  options: Omit<ResolveAppUrlOptions, "path"> & { path?: string },
) {
  return buildRuntimeAppUrl({
    ...options,
    path: options.path ?? "/sign-up",
  });
}
