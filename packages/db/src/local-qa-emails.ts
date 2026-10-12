/**
 * Rewrites every email in the LOCAL development database to the QA domain so a
 * production copy can be used for passwordless local QA login without real
 * addresses (ADR-0079). Refuses to run anywhere but a loopback local database.
 *
 *   bun run --cwd packages/db with-env bun src/local-qa-emails.ts
 */
import { LOCAL_QA_EMAIL_DOMAIN, isLocalQaEmail } from "./development-access";
import { prisma } from "./prisma";

/** Readable local part from an address: lowercase, [a-z0-9._-] only. */
function qaLocalPart(email: string) {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const cleaned = local.replace(/\+.*$/, "").replace(/[^a-z0-9._-]+/g, ".").replace(/^[.-]+|[.-]+$/g, "");
  return cleaned || "user";
}

/**
 * Maps original addresses to unique QA addresses. The same original address
 * (case-insensitive) always maps to the same QA address, so a user and their
 * staff profile stay linked. Addresses already on the QA domain are kept.
 */
export function buildLocalQaEmailMap(emails: Array<string | null | undefined>) {
  const map = new Map<string, string>();
  const taken = new Set<string>();
  const originals = [...new Set(emails.filter((e): e is string => !!e?.trim()).map((e) => e.trim().toLowerCase()))];
  for (const email of originals) if (isLocalQaEmail(email)) { map.set(email, email); taken.add(email); }
  for (const email of originals) {
    if (map.has(email)) continue;
    const base = qaLocalPart(email);
    let candidate = `${base}@${LOCAL_QA_EMAIL_DOMAIN}`;
    for (let n = 2; taken.has(candidate); n++) candidate = `${base}.${n}@${LOCAL_QA_EMAIL_DOMAIN}`;
    map.set(email, candidate);
    taken.add(candidate);
  }
  return map;
}

export function assertLocalLoopbackDatabase(env: NodeJS.ProcessEnv = process.env) {
  let host = "";
  try {
    host = new URL(env.DATABASE_URL ?? "").hostname;
  } catch {}
  if (env.SCHOOL_CLERK_DB_MODE !== "local" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    throw new Error("Refusing to rewrite emails: SCHOOL_CLERK_DB_MODE must be local and DATABASE_URL must point at a loopback host.");
  }
}

const EMAIL_COLUMNS = [
  ["User", "email"],
  ["SaasAccount", "email"],
  ["StaffProfile", "email"],
  ["AssessmentPublicLink", "requesterEmail"],
  ["EnrollmentApplicationParent", "email"],
  ["FinancePayee", "email"],
] as const;

export async function rewriteLocalEmailsToQa() {
  assertLocalLoopbackDatabase();
  const values: string[] = [];
  for (const [table, column] of EMAIL_COLUMNS) {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT DISTINCT "${column}" AS value FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}" <> ''`,
    );
    values.push(...rows.map((row) => row.value));
  }
  const map = buildLocalQaEmailMap(values);
  const changes = [...map].filter(([from, to]) => from !== to);
  const counts: Record<string, number> = {};
  await prisma.$transaction(async (tx) => {
    for (const [table, column] of EMAIL_COLUMNS) {
      let updated = 0;
      for (const [from, to] of changes) {
        updated += await tx.$executeRawUnsafe(
          `UPDATE "${table}" SET "${column}" = $1 WHERE lower(trim("${column}")) = $2`,
          to,
          from,
        );
      }
      counts[`${table}.${column}`] = updated;
    }
  }, { timeout: 120_000 });
  return { addresses: changes.length, counts };
}

if (import.meta.main) {
  rewriteLocalEmailsToQa()
    .then((result) => {
      console.log(`Rewrote ${result.addresses} address(es) to @${LOCAL_QA_EMAIL_DOMAIN}`, result.counts);
      process.exit(0);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
