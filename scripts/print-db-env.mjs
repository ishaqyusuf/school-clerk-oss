#!/usr/bin/env node

import { applyDatabaseProfile } from "./database-profile.mjs";

const URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DIRECT_URL",
  "PROD_DATABASE_URL",
  "PROD_POSTGRES_URL",
  "REMOTE_DEV_DATABASE_URL",
  "LOCAL_DATABASE_URL",
];

const CONTEXT_ENV_KEYS = [
  "APP_ENV",
  "NODE_ENV",
  "SCHOOL_CLERK_DB_MODE",
  "DEV_PROFILE",
  "VERCEL",
  "VERCEL_ENV",
];

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "postgres",
]);

function maskUrlValue(value) {
  try {
    const url = new URL(value);
    const database = url.pathname.replace(/^\/+/, "") || "(none)";
    const port = url.port || "(default)";
    const localMarker = LOCAL_HOSTS.has(url.hostname) ? " local-host" : "";

    return `${url.protocol}//***:***@${url.hostname}:${port}/${database}${localMarker}`;
  } catch {
    return "present but invalid URL";
  }
}

function printUrlEnv(key) {
  const value = process.env[key];

  if (!value) {
    console.log(`[db-env] ${key}=missing`);
    return;
  }

  console.log(`[db-env] ${key}=${maskUrlValue(value)}`);
}

function printContextEnv(key) {
  const value = process.env[key];
  console.log(`[db-env] ${key}=${value || "missing"}`);
}

function printEffectiveDatabaseUrl() {
  const effectiveEnv = applyDatabaseProfile({ ...process.env });
  const value = effectiveEnv.DATABASE_URL;

  if (!value) {
    console.log("[db-env] EFFECTIVE_DATABASE_URL=missing");
    return;
  }

  console.log(`[db-env] EFFECTIVE_DATABASE_URL=${maskUrlValue(value)}`);
}

console.log("[db-env] sanitized database environment before Prisma generate");

for (const key of CONTEXT_ENV_KEYS) {
  printContextEnv(key);
}

printEffectiveDatabaseUrl();

for (const key of URL_ENV_KEYS) {
  printUrlEnv(key);
}
