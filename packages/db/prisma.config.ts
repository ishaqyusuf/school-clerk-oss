import { defineConfig } from "prisma/config";

function normalizePgConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (
    sslMode &&
    ["prefer", "require", "verify-ca"].includes(sslMode) &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function resolveDatasourceUrl() {
  const configuredUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

  if (!configuredUrl) {
    return "";
  }

  return normalizePgConnectionString(configuredUrl);
}

export default defineConfig({
  schema: "./src/schema",
  datasource: {
    url: resolveDatasourceUrl(),
  },
});
