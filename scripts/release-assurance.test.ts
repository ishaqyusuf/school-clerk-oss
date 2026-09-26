import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  loadSignedProviderBundle,
  type SchoolClerkProviderBundle,
} from "../.release/school-clerk-provider-bundle";
import { checkRelease } from "../.release/release-adapter";
import { validateReleaseManifest } from "../.release/toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/manifest";
import {
  planRelease,
  type ReleaseManifest,
  type ReleaseTargetChange,
} from "../.release/toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/plan";

const root = resolve(import.meta.dir, "..");
const toolkitRevision = "ec653d87eb0b65bbac9235680d85eed6fdfd20a1";
const key = "school-clerk-release-test-key-32-bytes-minimum";
const variables = [
  "SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE",
  "SCHOOL_CLERK_RELEASE_EVIDENCE_HMAC_KEY",
  "SCHOOL_CLERK_VERCEL_DASHBOARD_PROJECT_ID",
  "SCHOOL_CLERK_VERCEL_MARKETING_PROJECT_ID",
  "SCHOOL_CLERK_VERCEL_SITE_PROJECT_ID",
  "SCHOOL_CLERK_VERCEL_API_PROJECT_ID",
  "SCHOOL_CLERK_TRIGGER_PROJECT_REF",
] as const;
const original = Object.fromEntries(variables.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of variables) {
    const value = original[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function revision() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function manifest() {
  return JSON.parse(readFileSync(resolve(root, "release.manifest.json"), "utf8")) as ReleaseManifest;
}

function context(environment: "preview" | "production") {
  return { environment, revision: revision(), repository: root, toolkitRevision };
}

function sign(bundle: SchoolClerkProviderBundle) {
  const payload = Buffer.from(JSON.stringify(bundle)).toString("base64url");
  return JSON.stringify({ version: 1, payload,
    signature: createHmac("sha256", key).update(payload).digest("hex") });
}

function configure() {
  process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_HMAC_KEY = key;
  process.env.SCHOOL_CLERK_VERCEL_DASHBOARD_PROJECT_ID = "prj_dashboard";
  process.env.SCHOOL_CLERK_VERCEL_MARKETING_PROJECT_ID = "prj_marketing";
  process.env.SCHOOL_CLERK_VERCEL_SITE_PROJECT_ID = "prj_site";
  process.env.SCHOOL_CLERK_VERCEL_API_PROJECT_ID = "prj_api";
  process.env.SCHOOL_CLERK_TRIGGER_PROJECT_REF = "school-clerk-jobs";
}

function bundle(environment: "preview" | "production"): SchoolClerkProviderBundle {
  const releaseRevision = revision();
  const now = Date.now();
  const completedAt = new Date(now - 10_000).toISOString();
  const observedAt = new Date(now).toISOString();
  const targets = manifest().targets;
  const fingerprints = Object.fromEntries(targets.map((target, index) => [target.id, {
    kind: target.kind === "database" ? "schema" as const : "configuration" as const,
    value: String(index + 1).repeat(64),
  }]));
  const receipts = targets.map((target, index) => ({
    version: 1 as const,
    project: "school-clerk",
    targetId: target.id,
    targetKind: target.kind,
    action: target.kind === "database" ? "db-push" as const :
      target.kind === "jobs" ? "jobs-deploy" as const : "web-deploy" as const,
    provider: target.kind === "database" ? "neon" :
      target.kind === "jobs" ? "trigger" : "vercel",
    environment,
    revision: releaseRevision,
    fingerprint: fingerprints[target.id]!,
    deploymentId: `deployment_${index + 1}`,
    result: "succeeded" as const,
    completedAt,
  }));
  return {
    version: 1,
    project: "school-clerk",
    environment,
    revision: releaseRevision,
    generatedAt: observedAt,
    receipts,
    evidence: receipts.map(({ version: _version, ...receipt }) => receipt),
    liveState: receipts.map((receipt) => ({
      project: receipt.project,
      targetId: receipt.targetId,
      targetKind: receipt.targetKind,
      environment: receipt.environment,
      revision: receipt.revision,
      provider: receipt.provider,
      deploymentId: receipt.deploymentId,
      fingerprint: receipt.fingerprint,
      active: true,
      observedAt,
    })),
    fingerprints,
    vercel: { deploymentIds: {}, deployments: [], domains: [], promotionGates: [] },
    jobs: {
      deploymentIds: {},
      configurationFingerprints: { jobs: fingerprints.jobs!.value },
      deployments: [],
      previewWaiverIds: environment === "preview" ? { jobs: "waiver_preview_jobs" } : undefined,
      waivers: environment === "preview" ? [{
        id: "waiver_preview_jobs",
        project: "school-clerk",
        targetId: "jobs",
        environment: "preview",
        revision: releaseRevision,
        status: "approved",
        protectedApproval: true,
        approvedBy: "release-reviewer",
        reason: "Preview Trigger worker is not provisioned.",
        expiresAt: new Date(now + 60_000).toISOString(),
      }] : undefined,
    },
  };
}

describe("School Clerk release manifest", () => {
  test("covers web, database and jobs without mobile", () => {
    const releaseManifest = manifest();
    expect(() => validateReleaseManifest(releaseManifest)).not.toThrow();
    expect(releaseManifest.targets.map((target) => target.id)).toEqual([
      "database", "dashboard-web", "marketing-web", "school-site-web", "api-web", "jobs",
    ]);
    expect(releaseManifest.targets.some((target) => target.kind === "mobile")).toBe(false);
  });

  for (const environment of ["preview", "production"] as const) {
    test(`${environment} propagates schema changes before all dependent deployments`, () => {
      const targets = manifest().targets;
      const changes: Record<string, ReleaseTargetChange> = Object.fromEntries(targets.map((target) => [target.id, {
        baseRevision: "a".repeat(40), changedPaths: [],
      } satisfies ReleaseTargetChange]));
      changes.database = { baseRevision: "a".repeat(40),
        changedPaths: ["packages/db/src/schema/student.prisma"] };
      const plan = planRelease(manifest(), { environment, revision: "b".repeat(40),
        targetChanges: changes });
      expect(plan.actions.map((action) => action.targetId)).toEqual([
        "database", "dashboard-web", "marketing-web", "school-site-web", "api-web", "jobs",
      ]);
      expect(plan.actions[0]?.action).toBe("db-push");
    });
  }
});

describe("School Clerk signed provider gate", () => {
  test("rejects missing, tampered and wrong-revision evidence", () => {
    const releaseContext = context("preview");
    delete process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_HMAC_KEY;
    expect(() => loadSignedProviderBundle(releaseContext)).toThrow("key is unavailable");
    configure();
    const current = bundle("preview");
    process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE = sign(current).replace(/a/, "x");
    expect(() => loadSignedProviderBundle(releaseContext)).toThrow();
    current.revision = "f".repeat(40);
    process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE = sign(current);
    expect(() => loadSignedProviderBundle(releaseContext)).toThrow("does not match this release");
  });

  for (const environment of ["preview", "production"] as const) {
    test(`${environment} verifies a signed exact-revision provider snapshot`, async () => {
      configure();
      process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE = sign(bundle(environment));
      const report = await checkRelease(context(environment));
      expect(report.ready).toBe(true);
      expect(report.targets).toHaveLength(6);
      expect(report.targets.every((target) => target.ready)).toBe(true);
      expect(report.targets.find((target) => target.targetId === "jobs")?.reason).toBe(
        environment === "preview" ? "waived" : "verified",
      );
    });
  }

  test("Preview jobs fail closed without a protected waiver", async () => {
    configure();
    const current = bundle("preview");
    current.jobs.previewWaiverIds = {};
    process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE = sign(current);
    const report = await checkRelease(context("preview"));
    expect(report.ready).toBe(false);
    expect(report.targets.find((target) => target.targetId === "jobs")?.reason).toBe(
      "provider-action-unready",
    );
  });
});
