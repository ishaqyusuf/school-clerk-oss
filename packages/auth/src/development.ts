// A hostname or NODE_ENV alone is not authority to impersonate a user.
export function isLocalDevelopmentDatabase() {
  if (process.env.NODE_ENV !== "development" || process.env.SCHOOL_CLERK_DB_MODE !== "local") return false;
  try {
    const database = new URL(process.env.DATABASE_URL ?? "");
    return ["postgres:", "postgresql:"].includes(database.protocol) &&
      ["localhost", "127.0.0.1", "[::1]", "::1"].includes(database.hostname);
  } catch {
    return false;
  }
}

export function isLoopbackRequestHost(host: string | null | undefined) {
  try {
    const hostname = new URL(`http://${host ?? ""}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" ||
      hostname === "[::1]" || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export function isDevelopmentQuickLoginEnabled() {
  return process.env.SCHOOL_CLERK_ENABLE_DEV_QUICK_LOGIN !== "false" &&
    isLocalDevelopmentDatabase();
}
