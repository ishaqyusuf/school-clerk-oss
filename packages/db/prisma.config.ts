import { defineConfig, env } from "prisma/config";

const placeholderDatabaseUrl =
  "postgresql://school_clerk:school_clerk@localhost:5432/school_clerk";

function isCodegenCommand() {
  return process.argv.some((arg) => arg === "generate" || arg === "validate");
}

function databaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (isCodegenCommand()) {
    return placeholderDatabaseUrl;
  }

  return env("DATABASE_URL");
}

export default defineConfig({
  schema: "./src/schema",
  datasource: {
    url: databaseUrl(),
  },
});
