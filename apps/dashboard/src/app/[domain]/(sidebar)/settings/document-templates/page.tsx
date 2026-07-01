import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { prisma } from "@school-clerk/db";
import {
  DEFAULT_SCHOOL_DOCUMENT_TEMPLATE_IDS,
  getSchoolDocumentTemplateById,
  getSchoolDocumentTemplates,
} from "@school-clerk/pdf/document-templates";
import {
  JsonDocumentTemplatePreview,
  jsonDocumentTemplateSchema,
  simpleAdmissionLetterJsonTemplate,
} from "@school-clerk/pdf/json-template";
import { createBlobUploadError } from "@school-clerk/utils";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { env } from "@/env";

const resultTemplates = getSchoolDocumentTemplates({
  documentType: "RESULT_SHEET",
  schoolSystem: "k12",
});
const CUSTOM_TEMPLATE_DOCUMENT_TYPES = [
  { label: "Admission letter", value: "ADMISSION_LETTER" },
  { label: "Admission form", value: "ADMISSION_FORM" },
  { label: "Result sheet", value: "RESULT_SHEET" },
] as const;
const CUSTOM_TEMPLATE_STATUSES = [
  "SUBMITTED",
  "QUOTED",
  "PAID",
  "IN_BUILD",
  "READY",
  "REJECTED",
] as const;
const CUSTOM_TEMPLATE_OPERATOR_ROLES = new Set(
  (process.env.SCHOOL_CLERK_TEMPLATE_OPERATOR_ROLES ?? "PLATFORM_ADMIN,SUPER_ADMIN")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
);
const ALLOWED_TEMPLATE_SOURCE_FILES = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_TEMPLATE_SOURCE_FILE_SIZE = 20 * 1024 * 1024;
type SelectableDocumentTemplate = {
  description: string;
  label: string;
  source: "code" | "custom" | "json";
  templateId: string;
  templateVersion: number;
};

const jsonAdmissionPreviewPayload = {
  applicationReference: "ADM-2026",
  approvedAt: "30 Jun 2026",
  classroomName: "Primary 1",
  parentName: "Parent/Guardian",
  payment: {
    amount: "NGN 25,000.00",
    dueAt: "15 Jul 2026",
    instructions: "Pay at the school bursary or use the payment link in the email.",
    label: "Admission payment",
    required: true,
  },
  schoolAddress: "School address",
  schoolName: "School Clerk Academy",
  sessionLabel: "2026/2027 Academic Session",
  studentName: "Ada Student",
};

function assertSchoolCookie(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>,
): asserts cookie is NonNullable<typeof cookie> & { domain: string; schoolId: string } {
  if (!cookie?.schoolId || !cookie?.domain) {
    throw new Error("School context is required.");
  }
}

async function getCurrentUserRole(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>,
) {
  if (!cookie?.auth?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: cookie.auth.userId },
    select: { role: true },
  });

  return user?.role ?? null;
}

async function isCustomTemplateOperator(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>,
) {
  const role = await getCurrentUserRole(cookie);
  return Boolean(role && CUSTOM_TEMPLATE_OPERATOR_ROLES.has(role));
}

async function assertCustomTemplateOperator(
  cookie: Awaited<ReturnType<typeof getAuthCookie>>,
) {
  assertSchoolCookie(cookie);

  if (!(await isCustomTemplateOperator(cookie))) {
    throw new Error(
      "Only platform template operators can quote, build, or mark custom templates ready.",
    );
  }
}

function parseBuiltTemplateJson(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;

  try {
    return jsonDocumentTemplateSchema.parse(JSON.parse(raw));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON.";
    throw new Error(`Built template JSON is invalid. ${detail}`);
  }
}

function formatDateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizePaymentLink(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Payment link must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Payment link must use http or https.");
  }

  return url.toString();
}

function parsePaymentDueDate(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;

  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Payment due date is invalid.");
  }

  return date;
}

async function resolveSelectableTemplateForSchool({
  documentType,
  schoolId,
  templateId,
}: {
  documentType: string;
  schoolId: string;
  templateId: string;
}): Promise<SelectableDocumentTemplate> {
  try {
    const template = getSchoolDocumentTemplateById(templateId);
    if (template.documentType === documentType) {
      return {
        description: template.description,
        label: template.label,
        source: template.source,
        templateId: template.templateId,
        templateVersion: template.templateVersion,
      };
    }
  } catch {
    // Continue to custom templates below.
  }

  const customTemplate = await (prisma as any).customDocumentTemplateRequest.findFirst({
    where: {
      builtTemplateId: templateId,
      deletedAt: null,
      documentType,
      schoolProfileId: schoolId,
      status: "READY",
    },
    select: {
      builtTemplateJson: true,
      builtTemplateVersion: true,
      title: true,
    },
  });

  if (!customTemplate?.builtTemplateJson) {
    throw new Error("Selected template is not ready for this school.");
  }

  const parsed = jsonDocumentTemplateSchema.parse(customTemplate.builtTemplateJson);
  if (parsed.documentType !== documentType || parsed.templateId !== templateId) {
    throw new Error("Selected custom template metadata does not match this document type.");
  }

  return {
    description: "Custom JSON template built from the school's uploaded source.",
    label: customTemplate.title,
    source: "custom",
    templateId: parsed.templateId,
    templateVersion: customTemplate.builtTemplateVersion ?? parsed.templateVersion,
  };
}

async function saveResultTemplatePreference(formData: FormData) {
  "use server";

  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  const templateId = String(formData.get("templateId") ?? "");
  const template = await resolveSelectableTemplateForSchool({
    documentType: "RESULT_SHEET",
    schoolId: cookie.schoolId,
    templateId,
  });

  const existing = await (
    prisma as any
  ).schoolDocumentTemplatePreference.findFirst({
    where: {
      deletedAt: null,
      documentType: "RESULT_SHEET",
      schoolProfileId: cookie.schoolId,
    },
    select: { id: true },
  });

  if (existing) {
    await (prisma as any).schoolDocumentTemplatePreference.update({
      where: { id: existing.id },
      data: {
        source: template.source,
        templateId: template.templateId,
        templateVersion: template.templateVersion,
      },
    });
  } else {
    await (prisma as any).schoolDocumentTemplatePreference.create({
      data: {
        documentType: "RESULT_SHEET",
        schoolProfileId: cookie.schoolId,
        source: template.source,
        templateId: template.templateId,
        templateVersion: template.templateVersion,
      },
    });
  }

  revalidatePath(`/${cookie.domain}/settings/document-templates`);
}

async function createCustomTemplateRequest(formData: FormData) {
  "use server";

  const cookie = await getAuthCookie();
  assertSchoolCookie(cookie);

  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required before uploading templates.");
  }

  const documentType = String(formData.get("documentType") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const file = formData.get("file");

  if (!CUSTOM_TEMPLATE_DOCUMENT_TYPES.some((item) => item.value === documentType)) {
    throw new Error("Unsupported document template type.");
  }

  if (!title) {
    throw new Error("Template request title is required.");
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Upload the existing PDF, scan, or image to map.");
  }

  const extension = ALLOWED_TEMPLATE_SOURCE_FILES.get(file.type);
  if (!extension) {
    throw new Error("Only PDF, JPG, PNG, and WebP uploads are supported.");
  }

  if (file.size > MAX_TEMPLATE_SOURCE_FILE_SIZE) {
    throw new Error("Template source uploads must be 20MB or smaller.");
  }

  const key = `custom-document-template-requests/${cookie.schoolId}/${documentType}/${crypto.randomUUID()}.${extension}`;
  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
    token: env.BLOB_READ_WRITE_TOKEN,
  }).catch((error) => {
    throw createBlobUploadError("Template source storage", error);
  });

  await (prisma as any).customDocumentTemplateRequest.create({
    data: {
      documentType,
      mimeType: file.type,
      notes: notes || null,
      requestedByUserId: cookie.auth?.userId ?? null,
      schoolProfileId: cookie.schoolId,
      sizeBytes: file.size,
      sourceFileName: file.name,
      sourceFileUrl: blob.url,
      status: "SUBMITTED",
      storageKey: blob.pathname,
      storageProvider: "vercel-blob",
      title,
    },
  });

  revalidatePath(`/${cookie.domain}/settings/document-templates`);
}

async function updateCustomTemplateRequest(formData: FormData) {
  "use server";

  const cookie = await getAuthCookie();
  await assertCustomTemplateOperator(cookie);

  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const builtTemplateId = String(formData.get("builtTemplateId") ?? "").trim();
  const builtTemplateVersion = Number(formData.get("builtTemplateVersion") ?? "1");
  const builtTemplate = parseBuiltTemplateJson(formData.get("builtTemplateJson"));
  const operatorNotes = String(formData.get("operatorNotes") ?? "").trim();
  const quotedAmountRaw = String(formData.get("quotedAmount") ?? "").trim();
  const quotedAmount = quotedAmountRaw ? Number(quotedAmountRaw) : null;
  const quotedCurrency = String(formData.get("quotedCurrency") ?? "NGN")
    .trim()
    .toUpperCase();
  const quotePaymentInstructions = String(
    formData.get("quotePaymentInstructions") ?? "",
  ).trim();
  const quotePaymentLink = normalizePaymentLink(formData.get("quotePaymentLink"));
  const quotePaymentDueAt = parsePaymentDueDate(formData.get("quotePaymentDueAt"));

  if (!CUSTOM_TEMPLATE_STATUSES.includes(status as any)) {
    throw new Error("Unsupported request status.");
  }

  if (quotedAmount != null && (!Number.isFinite(quotedAmount) || quotedAmount < 0)) {
    throw new Error("Quote amount must be zero or greater.");
  }

  if (
    status === "QUOTED" &&
    quotedAmount != null &&
    quotedAmount > 0 &&
    !quotePaymentInstructions &&
    !quotePaymentLink
  ) {
    throw new Error("Quoted paid templates need payment instructions or a payment link.");
  }

  if (status === "READY" && !builtTemplateId) {
    throw new Error("Ready custom templates need a built template ID.");
  }

  if (status === "READY" && !builtTemplate) {
    throw new Error("Ready custom templates need validated built template JSON.");
  }

  if (builtTemplate && builtTemplate.templateId !== builtTemplateId) {
    throw new Error("Built template JSON templateId must match the built template ID.");
  }

  const request = await (prisma as any).customDocumentTemplateRequest.findFirst({
    where: {
      deletedAt: null,
      id: requestId,
      schoolProfileId: cookie.schoolId,
    },
    select: {
      documentType: true,
      id: true,
    },
  });

  if (!request) {
    throw new Error("Template request not found.");
  }

  if (builtTemplate && builtTemplate.documentType !== request.documentType) {
    throw new Error("Built template JSON documentType must match this request.");
  }

  await (prisma as any).customDocumentTemplateRequest.update({
    where: { id: request.id },
    data: {
      builtTemplateId: builtTemplateId || null,
      builtTemplateVersion:
        builtTemplate?.templateVersion ??
        (Number.isFinite(builtTemplateVersion) && builtTemplateVersion > 0
          ? builtTemplateVersion
          : null),
      builtTemplateJson: builtTemplate,
      operatorNotes: operatorNotes || null,
      quotePaymentDueAt,
      quotePaymentInstructions: quotePaymentInstructions || null,
      quotePaymentLink,
      quotedAmount,
      quotedCurrency: quotedCurrency || "NGN",
      status,
    },
  });

  revalidatePath(`/${cookie.domain}/settings/document-templates`);
}

async function getCurrentResultTemplatePreference(schoolId?: string | null) {
  if (!schoolId) return null;

  return (prisma as any).schoolDocumentTemplatePreference.findFirst({
    where: {
      deletedAt: null,
      documentType: "RESULT_SHEET",
      schoolProfileId: schoolId,
    },
    select: {
      source: true,
      templateId: true,
      templateVersion: true,
    },
  });
}

async function listCustomTemplateRequests(schoolId?: string | null) {
  if (!schoolId) return [];

  return (prisma as any).customDocumentTemplateRequest.findMany({
    where: {
      deletedAt: null,
      schoolProfileId: schoolId,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export default async function DocumentTemplatesPage() {
  const cookie = await getAuthCookie();
  const [preference, customRequests, canManageCustomBuilds] = await Promise.all([
    getCurrentResultTemplatePreference(cookie?.schoolId),
    listCustomTemplateRequests(cookie?.schoolId),
    isCustomTemplateOperator(cookie),
  ]);
  const customResultTemplates: SelectableDocumentTemplate[] = customRequests
    .filter(
      (request: any) =>
        request.status === "READY" &&
        request.documentType === "RESULT_SHEET" &&
        request.builtTemplateId &&
        request.builtTemplateJson,
    )
    .map((request: any) => ({
      description: "Custom result template built from an uploaded source document.",
      label: request.title,
      source: "custom",
      templateId: request.builtTemplateId,
      templateVersion: request.builtTemplateVersion ?? 1,
    }));
  const selectableResultTemplates: SelectableDocumentTemplate[] = [
    ...resultTemplates.map((template) => ({
      description: template.description,
      label: template.label,
      source: template.source,
      templateId: template.templateId,
      templateVersion: template.templateVersion,
    })),
    ...customResultTemplates,
  ];
  const activeTemplateId =
    preference?.templateId ?? DEFAULT_SCHOOL_DOCUMENT_TEMPLATE_IDS.RESULT_SHEET;

  return (
    <div className="space-y-6 py-4">
      <PageTitle>Document Templates</PageTitle>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Result sheet template</CardTitle>
          <CardDescription>
            Choose the default template used when staff print or download student
            result PDFs without a template override.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveResultTemplatePreference} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {selectableResultTemplates.map((template) => (
                <label
                  className="rounded-md border border-border p-4 text-sm"
                  key={template.templateId}
                >
                  <div className="flex items-start gap-3">
                    <input
                      className="mt-1"
                      defaultChecked={template.templateId === activeTemplateId}
                      name="templateId"
                      type="radio"
                      value={template.templateId}
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{template.label}</span>
                        <Badge variant="secondary">
                          v{template.templateVersion}
                        </Badge>
                        {template.templateId === activeTemplateId ? (
                          <Badge variant="success">Default</Badge>
                        ) : null}
                        {template.source === "custom" ? (
                          <Badge variant="outline">Custom</Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <Button type="submit">Save result template</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request a custom template build</CardTitle>
          <CardDescription>
            Upload an existing admission letter, admission form, or result sheet
            PDF/image so an operator can quote, build, and attach a finished
            template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCustomTemplateRequest} className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Document type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                name="documentType"
              >
                {CUSTOM_TEMPLATE_DOCUMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Request title</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3"
                name="title"
                placeholder="Existing nursery result sheet"
                required
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span>Source PDF or image</span>
              <input
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                name="file"
                required
                type="file"
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span>Notes</span>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
                name="notes"
                placeholder="What should be matched, changed, or kept from the uploaded document?"
              />
            </label>
            <Button className="md:w-fit" type="submit">
              Submit custom build request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom template requests</CardTitle>
          <CardDescription>
            Track quote/payment/build status for requested custom templates.
            Platform template operators connect finished builds to stable template IDs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!customRequests.length ? (
            <p className="text-sm text-muted-foreground">
              No custom template requests yet.
            </p>
          ) : (
            customRequests.map((request: any) => (
              <div
                className="space-y-3 rounded-md border border-border p-4"
                key={request.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.documentType.replaceAll("_", " ")}
                      {request.sourceFileUrl ? (
                        <>
                          {" "}
                          •{" "}
                          <a
                            className="underline"
                            href={request.sourceFileUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Source file
                          </a>
                        </>
                      ) : null}
                    </p>
                    {request.status === "READY" && request.builtTemplateId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Built template: {request.builtTemplateId} v
                        {request.builtTemplateVersion ?? 1}
                      </p>
                    ) : null}
                    {request.quotedAmount ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Quote: {request.quotedCurrency ?? "NGN"}{" "}
                        {request.quotedAmount.toString()}
                      </p>
                    ) : null}
                    {request.quotePaymentDueAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Payment due: {formatDisplayDate(request.quotePaymentDueAt)}
                      </p>
                    ) : null}
                    {request.quotePaymentInstructions ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Payment instructions: {request.quotePaymentInstructions}
                      </p>
                    ) : null}
                    {request.quotePaymentLink ? (
                      <Button asChild className="mt-2" size="sm" variant="outline">
                        <a
                          href={request.quotePaymentLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open payment link
                        </a>
                      </Button>
                    ) : null}
                    {request.operatorNotes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Note: {request.operatorNotes}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={request.status === "READY" ? "success" : "secondary"}>
                    {request.status.replaceAll("_", " ")}
                  </Badge>
                </div>

                {canManageCustomBuilds ? (
                  <form
                    action={updateCustomTemplateRequest}
                    className="grid gap-3 md:grid-cols-5"
                  >
                    <input name="requestId" type="hidden" value={request.id} />
                    <label className="block space-y-1 text-xs">
                      <span>Status</span>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.status}
                        name="status"
                      >
                        {CUSTOM_TEMPLATE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>Quote amount</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.quotedAmount?.toString?.() ?? ""}
                        min="0"
                        name="quotedAmount"
                        step="0.01"
                        type="number"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>Currency</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.quotedCurrency ?? "NGN"}
                        maxLength={3}
                        name="quotedCurrency"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>Payment due</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={formatDateInput(request.quotePaymentDueAt)}
                        name="quotePaymentDueAt"
                        type="date"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>Built template ID</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.builtTemplateId ?? ""}
                        name="builtTemplateId"
                        placeholder="custom-result-v1"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span>Version</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.builtTemplateVersion ?? 1}
                        min="1"
                        name="builtTemplateVersion"
                        type="number"
                      />
                    </label>
                    <label className="block space-y-1 text-xs md:col-span-2">
                      <span>Payment link</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.quotePaymentLink ?? ""}
                        name="quotePaymentLink"
                        placeholder="https://pay.example.com/custom-template"
                        type="url"
                      />
                    </label>
                    <label className="block space-y-1 text-xs md:col-span-3">
                      <span>Payment instructions</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.quotePaymentInstructions ?? ""}
                        name="quotePaymentInstructions"
                        placeholder="Pay this quote before the build starts."
                      />
                    </label>
                    <label className="block space-y-1 text-xs md:col-span-5">
                      <span>Operator notes</span>
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-2"
                        defaultValue={request.operatorNotes ?? ""}
                        name="operatorNotes"
                      />
                    </label>
                    <label className="block space-y-1 text-xs md:col-span-5">
                      <span>Built template JSON</span>
                      <textarea
                        className="min-h-32 w-full rounded-md border border-input bg-background px-2 py-2 font-mono text-xs"
                        defaultValue={
                          request.builtTemplateJson
                            ? JSON.stringify(request.builtTemplateJson, null, 2)
                            : ""
                        }
                        name="builtTemplateJson"
                        placeholder='{"templateId":"custom-result-v1","templateVersion":1,"documentType":"RESULT_SHEET","label":"Custom Result","pages":[...]}'
                      />
                    </label>
                    <Button className="md:w-fit" size="sm" type="submit">
                      Update request
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">JSON admission template preview</CardTitle>
          <CardDescription>
            This preview is rendered from a constrained JSON template. The same
            template ID can be selected during admission approval and rendered as
            a PDF for parents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[560px] overflow-auto rounded-md bg-muted p-3">
            <JsonDocumentTemplatePreview
              payload={jsonAdmissionPreviewPayload}
              template={simpleAdmissionLetterJsonTemplate}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
