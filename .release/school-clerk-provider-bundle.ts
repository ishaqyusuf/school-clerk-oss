import { createHmac, timingSafeEqual } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type {
  ConsumerProviderBindings,
  ConsumerReleaseContext,
} from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/consumer";
import type {
  ProviderReleaseMetadata,
  ReleaseFingerprint,
  ReleaseReceipt,
} from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/evidence";
import {
  verifyJobsDeployments,
  type JobsDeploymentRecord,
  type JobsPreviewWaiverRecord,
  type JobsTargetConfig,
} from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/jobs";
import type { ProviderLiveStateMetadata } from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/live-state";
import {
  verifyVercelWebDeployments,
  type VercelDeploymentMetadata,
  type VercelDomainAssignment,
  type VercelPromotionGate,
  type VercelWebTarget,
} from "./toolkit/ec653d87eb0b65bbac9235680d85eed6fdfd20a1/src/release/vercel";

const MAX_BYTES = 1024 * 1024;
const MAX_AGE_MS = 5 * 60 * 1000;
const PROJECT = "school-clerk";
const PROJECT_ID = /^prj_[A-Za-z0-9]+$/;
const TRIGGER_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export type SchoolClerkProviderBundle = {
  version: 1;
  project: "school-clerk";
  environment: "preview" | "production";
  revision: string;
  generatedAt: string;
  receipts: ReleaseReceipt[];
  evidence: ProviderReleaseMetadata[];
  liveState: ProviderLiveStateMetadata[];
  fingerprints: Record<string, ReleaseFingerprint | undefined>;
  vercel: {
    deploymentIds: Record<string, string | null | undefined>;
    deployments: VercelDeploymentMetadata[];
    domains: Array<{ domain: string; assignment: VercelDomainAssignment }>;
    promotionGates: Array<{ projectId: string; gate: VercelPromotionGate }>;
  };
  jobs: {
    deploymentIds: Record<string, string | null | undefined>;
    configurationFingerprints: Record<string, string | null | undefined>;
    deployments: JobsDeploymentRecord[];
    previewWaiverIds?: Record<string, string | null | undefined>;
    waivers?: JobsPreviewWaiverRecord[];
  };
};

function requiredProjectId(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!PROJECT_ID.test(value)) {
    throw new Error(`Release verification needs ${name} from protected CI configuration.`);
  }
  return value;
}

export function webTargets(): VercelWebTarget[] {
  return [
    {
      targetId: "dashboard-web",
      projectId: requiredProjectId("SCHOOL_CLERK_VERCEL_DASHBOARD_PROJECT_ID"),
      dbGateCheckName: "release-assurance-production",
    },
    {
      targetId: "marketing-web",
      projectId: requiredProjectId("SCHOOL_CLERK_VERCEL_MARKETING_PROJECT_ID"),
      productionDomain: "school-clerk.com",
      dbGateCheckName: "release-assurance-production",
    },
    {
      targetId: "school-site-web",
      projectId: requiredProjectId("SCHOOL_CLERK_VERCEL_SITE_PROJECT_ID"),
      dbGateCheckName: "release-assurance-production",
    },
    {
      targetId: "api-web",
      projectId: requiredProjectId("SCHOOL_CLERK_VERCEL_API_PROJECT_ID"),
      dbGateCheckName: "release-assurance-production",
    },
  ];
}

export function jobsTarget(): JobsTargetConfig {
  const projectRef = process.env.SCHOOL_CLERK_TRIGGER_PROJECT_REF?.trim() ?? "";
  if (!TRIGGER_REF.test(projectRef)) {
    throw new Error("Release verification needs SCHOOL_CLERK_TRIGGER_PROJECT_REF from protected CI configuration.");
  }
  return {
    targetId: "jobs",
    provider: "trigger",
    projectRef,
    preview: {
      capability: "unsupported",
      reason: "No isolated School Clerk Trigger Preview worker is configured.",
    },
    production: { capability: "isolated", providerEnvironment: "prod", branch: null },
  };
}

function evidenceText(context: ConsumerReleaseContext): string {
  const inline = process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_ENVELOPE?.trim();
  if (inline) {
    if (Buffer.byteLength(inline) > MAX_BYTES) throw new Error("Signed provider evidence is too large.");
    return inline;
  }
  const configured = process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_FILE?.trim() ||
    `.release/runtime/${context.environment}.json`;
  const root = resolve(context.repository);
  const path = resolve(root, configured);
  const fromRoot = relative(root, path);
  if (!fromRoot || fromRoot.startsWith("..") || fromRoot.includes("\\")) {
    throw new Error("Signed provider evidence must stay inside the repository.");
  }
  let stat;
  try { stat = lstatSync(path); }
  catch { throw new Error("Signed provider evidence is unavailable."); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) {
    throw new Error("Signed provider evidence file is invalid.");
  }
  return readFileSync(path, "utf8");
}

export function loadSignedProviderBundle(context: ConsumerReleaseContext): SchoolClerkProviderBundle {
  const key = process.env.SCHOOL_CLERK_RELEASE_EVIDENCE_HMAC_KEY ?? "";
  if (Buffer.byteLength(key) < 32) throw new Error("Signed provider evidence key is unavailable.");
  let envelope: { version?: unknown; payload?: unknown; signature?: unknown };
  try { envelope = JSON.parse(evidenceText(context)); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith("Signed")) throw error;
    throw new Error("Signed provider evidence is invalid.");
  }
  const encoded = envelope?.payload;
  const signature = envelope?.signature;
  if (envelope?.version !== 1 || typeof encoded !== "string" ||
      typeof signature !== "string" || !/^[A-Za-z0-9_-]+$/.test(encoded) ||
      !/^[0-9a-f]{64}$/i.test(signature)) {
    throw new Error("Signed provider evidence is invalid.");
  }
  const expected = createHmac("sha256", key).update(encoded).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Signed provider evidence is invalid.");
  }
  let payload: Partial<SchoolClerkProviderBundle>;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); }
  catch { throw new Error("Signed provider evidence is invalid."); }
  const timestamp = Date.parse(payload.generatedAt ?? "");
  const age = Date.now() - timestamp;
  if (payload.version !== 1 || payload.project !== PROJECT ||
      payload.environment !== context.environment || payload.revision !== context.revision ||
      !Number.isFinite(timestamp) || age < 0 || age > MAX_AGE_MS ||
      !Array.isArray(payload.receipts) || !Array.isArray(payload.evidence) ||
      !Array.isArray(payload.liveState) || !payload.fingerprints ||
      !payload.vercel || !payload.jobs) {
    throw new Error("Signed provider evidence does not match this release.");
  }
  return payload as SchoolClerkProviderBundle;
}

export function createSchoolClerkProviderBindings(
  context: ConsumerReleaseContext,
  bundle = loadSignedProviderBundle(context),
): ConsumerProviderBindings {
  return {
    receiptClaims: async () => bundle.receipts,
    lookupEvidence: async (provider, deploymentId) =>
      bundle.evidence.find((item) => item.provider === provider &&
        item.deploymentId === deploymentId) ?? null,
    lookupLiveState: async (receipt) =>
      bundle.liveState.find((item) => item.targetId === receipt.targetId &&
        item.provider === receipt.provider && item.deploymentId === receipt.deploymentId) ?? null,
    currentFingerprints: async () => bundle.fingerprints,
    verifyActions: async (_context, manifest, plan, evidence) => {
      const web = await verifyVercelWebDeployments({
        manifest,
        plan,
        configs: webTargets(),
        deploymentIds: bundle.vercel.deploymentIds,
        lookupDeployment: async (id) => bundle.vercel.deployments.find((item) => item.id === id) ?? null,
        lookupDomain: async (domain) => bundle.vercel.domains.find((item) => item.domain === domain)?.assignment ?? null,
        lookupPromotionGate: async (projectId) => bundle.vercel.promotionGates.find((item) => item.projectId === projectId)?.gate ?? null,
        databaseEvidence: evidence,
        currentSchemaFingerprints: {
          database: bundle.fingerprints.database?.kind === "schema"
            ? bundle.fingerprints.database.value : undefined,
        },
      });
      const jobs = await verifyJobsDeployments({
        manifest,
        plan,
        configs: [jobsTarget()],
        deploymentIds: bundle.jobs.deploymentIds,
        currentConfigurationFingerprints: bundle.jobs.configurationFingerprints,
        lookupDeployment: async (id) => bundle.jobs.deployments.find((item) => item.id === id) ?? null,
        previewWaiverIds: bundle.jobs.previewWaiverIds,
        lookupWaiver: async (id) => bundle.jobs.waivers?.find((item) => item.id === id) ?? null,
      });
      return { web, jobs };
    },
  };
}
