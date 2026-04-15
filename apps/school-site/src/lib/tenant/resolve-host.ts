export function resolveHost(rawHost: string | null): string {
  if (!rawHost) return "localhost";

  return rawHost
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}
