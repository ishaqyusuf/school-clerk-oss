import {
  publishWebsiteDraftAction,
} from "@/actions/website-config";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  getWebsiteConfigById,
  listWebsiteConfigsBySchoolProfileId,
  listWebsiteMediaAssetsBySchoolProfileId,
  prisma,
} from "@school-clerk/db";
import {
  createWebsitePreviewToken,
  getTemplateById,
  normalizeWebsiteTemplateConfigRecord,
  templateRegistry,
  type WebsiteTemplatePageKey,
} from "@school-clerk/template-registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WebsiteConfigEditorClient } from "./editor-client";

function getAuditTrail(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const entries = (value as { auditTrail?: unknown[] }).auditTrail;
  return Array.isArray(entries)
    ? entries.filter(
        (entry): entry is { type?: string; at?: string; userId?: string | null } =>
          typeof entry === "object" && !!entry
      )
    : [];
}

export default async function WebsiteConfigEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ configId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ configId }, query, cookie] = await Promise.all([
    params,
    searchParams,
    getAuthCookie(),
  ]);

  if (!cookie?.schoolId) {
    notFound();
  }

  const [configRecord, mediaAssets, configs, school] = await Promise.all([
    getWebsiteConfigById({
      id: configId,
      schoolProfileId: cookie.schoolId,
    }),
    listWebsiteMediaAssetsBySchoolProfileId(cookie.schoolId),
    listWebsiteConfigsBySchoolProfileId(cookie.schoolId),
    prisma.schoolProfile.findFirst({
      where: { id: cookie.schoolId },
      select: {
        id: true,
        name: true,
        subDomain: true,
      },
    }),
  ]);

  if (!configRecord || !school) {
    notFound();
  }

  const template = getTemplateById(templateRegistry, configRecord.templateId);
  const config = normalizeWebsiteTemplateConfigRecord(
    template,
    configRecord.schoolProfileId,
    configRecord
  );
  const availablePageKeys = template.manifest.pages.map((page) => page.key);
  const currentPage = (
    availablePageKeys.includes(query.page as WebsiteTemplatePageKey)
      ? query.page
      : template.manifest.pages[0]?.key
  ) as WebsiteTemplatePageKey;

  const tenant = {
    schoolProfileId: school.id,
    schoolName: school.name,
    institutionType: "K12" as const,
    subdomain: school.subDomain,
    customDomain: null,
  };
  const publishedConfig = configs.find(
    (candidate) => candidate.status === "PUBLISHED" && candidate.id !== config.id
  );
  const changedContentKeys = Object.keys(config.content).filter((key) => {
    const previousValue =
      typeof publishedConfig?.contentJson === "object" && publishedConfig.contentJson
        ? (publishedConfig.contentJson as Record<string, unknown>)[key]
        : undefined;
    return JSON.stringify(previousValue ?? null) !== JSON.stringify(config.content[key] ?? null);
  });
  const previewHost =
    process.env.NODE_ENV === "production" && process.env.APP_ROOT_DOMAIN
      ? `https://${school.subDomain ?? "school"}.${process.env.APP_ROOT_DOMAIN}`
      : `http://${school.subDomain ?? "school"}.localhost:3001`;
  const previewToken = createWebsitePreviewToken({
    configId: config.id,
    schoolProfileId: config.tenantId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24,
  });
  const previewExpiresAt = Number(previewToken.split(".")[0] ?? Date.now());
  const previewUrl = `${previewHost}${
    currentPage === "home"
      ? "/"
      : template.manifest.pages.find((page) => page.key === currentPage)?.route ?? "/"
  }?preview=${config.id}&token=${previewToken}`;
  const auditTrail = getAuditTrail(config.analyticsConfig);
  const auditSummary = auditTrail.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.type ?? "change";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PageTitle>{config.name}</PageTitle>
            <Badge variant={config.status === "published" ? "default" : "secondary"}>
              {config.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Edit content fields, adjust basic styling, toggle sections, and
            review the preview before publishing this website configuration.
          </p>
          <p className="text-xs text-muted-foreground">
            Preview URL:{" "}
            <a className="underline underline-offset-4" href={previewUrl} target="_blank">
              {previewUrl}
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Preview access expires {new Date(previewExpiresAt).toLocaleString()}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/website">Back to Website Settings</Link>
          </Button>
          {config.status !== "published" ? (
            <form action={publishWebsiteDraftAction}>
              <input type="hidden" name="configId" value={config.id} />
              <Button type="submit">Publish Live</Button>
            </form>
          ) : null}
        </div>
      </div>

      <WebsiteConfigEditorClient
        config={config}
        tenant={tenant}
        initialPageKey={currentPage}
        mediaAssets={mediaAssets}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">Diff vs Live</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {publishedConfig
              ? `${changedContentKeys.length} content fields differ from the current live website.`
              : "No live website published yet, so this draft has no live comparison baseline."}
          </p>
          {publishedConfig && changedContentKeys.length ? (
            <div className="mt-3 grid gap-2">
              {changedContentKeys.slice(0, 8).map((key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"
                >
                  {key}
                </div>
              ))}
              {changedContentKeys.length > 8 ? (
                <p className="text-xs text-muted-foreground">
                  +{changedContentKeys.length - 8} more changed field(s)
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold">Config Version</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Template config version {config.templateVersion ?? 1}.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold">Audit Trail</h3>
          {Object.keys(auditSummary).length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(auditSummary).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          ) : null}
          {auditTrail.length ? (
            <div className="mt-3 grid gap-2">
              {auditTrail
                .slice()
                .reverse()
                .map((entry, index) => (
                  <div
                    key={`${entry.type ?? "entry"}-${entry.at ?? index}`}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"
                  >
                    <strong className="text-foreground">
                      {(entry.type ?? "change").toUpperCase()}
                    </strong>{" "}
                    on{" "}
                    {entry.at ? new Date(entry.at).toLocaleString() : "unknown time"}
                    {entry.userId ? ` by ${entry.userId}` : ""}
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No audit entries yet for this config.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
