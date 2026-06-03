export function resolveHost(rawHost: string | null): string {
  if (!rawHost) return "localhost";

  const host = rawHost
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  if (process.env.NODE_ENV !== "production" && host.endsWith(".localhost")) {
    return host.slice(0, -".localhost".length);
  }

  return host;
}
