import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import {
  createWebsiteDraftAction,
  publishWebsiteDraftAction,
} from "@/actions/website-config";
import { WebsiteConfigEditorClient } from "./[configId]/editor-client";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
  listWebsiteConfigsBySchoolProfileId,
  listWebsiteMediaAssetsBySchoolProfileId,
  prisma,
} from "@school-clerk/db";
import {
  getTemplateById,
  normalizeWebsiteTemplateConfigRecord,
  templateRegistry,
  type WebsiteTemplatePageKey,
} from "@school-clerk/template-registry";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";

async function getWebsiteSettingsData(schoolId: string) {
  const [configs, mediaAssets, school] = await Promise.all([
    listWebsiteConfigsBySchoolProfileId(schoolId),
    listWebsiteMediaAssetsBySchoolProfileId(schoolId),
    prisma.schoolProfile.findFirst({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subDomain: true,
      },
    }),
  ]);
  const templates = Array.from(templateRegistry.values()).map((template) => ({
    id: template.manifest.id,
    name: template.manifest.name,
    description: template.manifest.description,
    tags: template.manifest.tags,
    features: template.manifest.features,
    pages: template.manifest.pages.map((page) => page.label),
  }));

  return {
    configs,
    mediaAssets,
    school,
    templates,
  };
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getLiveUrl(subdomain?: string | null) {
  const schoolSubdomain = subdomain || "school";

  if (process.env.NODE_ENV === "production" && process.env.APP_ROOT_DOMAIN) {
    return `https://${schoolSubdomain}.${process.env.APP_ROOT_DOMAIN}`;
  }

  const schoolSiteRoot =
    process.env.SCHOOL_SITE_ROOT_DOMAIN ?? "school-clerk-site.localhost:1355";

  return `http://${schoolSubdomain}.${schoolSiteRoot}`;
}

function pickActiveConfig<T extends { id: string; status: string }>(
  configs: T[],
  selectedConfigId?: string,
) {
  if (!configs.length) return null;

  const selected = selectedConfigId
    ? configs.find((config) => config.id === selectedConfigId)
    : null;

  return (
    selected ??
    configs.find((config) => config.status !== "PUBLISHED") ??
    configs.find((config) => config.status === "PUBLISHED") ??
    configs[0] ??
    null
  );
}

export default async function WebsiteSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ configId?: string; page?: string; template?: string }>;
}) {
  const cookie = await getAuthCookie();

  if (!cookie?.schoolId) {
    return (
      <div className="py-8">
        <PageTitle>Website</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenant context not found. Refresh the page and try again.
        </p>
      </div>
    );
  }

  const [{ configs, mediaAssets, school, templates }, query] =
    await Promise.all([
      getWebsiteSettingsData(cookie.schoolId),
      searchParams ?? Promise.resolve({}),
    ]);
  const activeConfigRecord = pickActiveConfig(configs, query.configId);
  const selectedStarterTemplate =
    templates.find((template) => template.id === query.template) ??
    templates[0];
  const liveUrl = getLiveUrl(school?.subDomain);

  if (!school) {
    return (
      <div className="py-8">
        <PageTitle>Website</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          School profile not found for this tenant.
        </p>
      </div>
    );
  }

  if (!activeConfigRecord) {
    return (
      <div className="fixed inset-0 z-50 flex min-h-0 flex-col gap-3 overflow-hidden bg-background p-3">
        <BuilderToolbar liveUrl={liveUrl} />

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)]">
          <main className="order-2 min-h-0 min-w-0 overflow-hidden rounded-xl border bg-white p-3">
            <div className="h-full min-h-0 overflow-hidden rounded-lg border bg-white shadow-sm">
              {selectedStarterTemplate ? (
                <iframe
                  src={`${liveUrl}/?template=${selectedStarterTemplate.id}`}
                  title={`${selectedStarterTemplate.name} preview`}
                  className="h-full min-h-0 w-full bg-white"
                />
              ) : (
                <div className="flex h-full min-h-0 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  No templates are registered yet.
                </div>
              )}
            </div>
          </main>

          <aside className="order-1 min-h-0 md:sticky md:top-3 md:self-start">
            <Card className="max-h-[calc(100vh-6rem)] overflow-hidden bg-white">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Template Config</CardTitle>
                <CardDescription>
                  Choose a starter template to create your first editable draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-13rem)] overflow-y-auto p-3">
                <div className="flex flex-col gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-3 rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {template.name}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                        <Badge variant="outline">{template.pages.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {template.features.slice(0, 3).map((feature) => (
                          <Badge key={feature} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/settings/website?template=${template.id}`}>
                            Preview
                          </Link>
                        </Button>
                        <form action={createWebsiteDraftAction}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <input
                            type="hidden"
                            name="templateName"
                            value={template.name}
                          />
                          <Button type="submit" size="sm">
                            Create Draft
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  const activeTemplate = getTemplateById(
    templateRegistry,
    activeConfigRecord.templateId,
  );
  const activeConfig = normalizeWebsiteTemplateConfigRecord(
    activeTemplate,
    activeConfigRecord.schoolProfileId,
    activeConfigRecord,
  );
  const availablePageKeys = activeTemplate.manifest.pages.map(
    (page) => page.key,
  );
  const currentPage = (
    availablePageKeys.includes(query.page as WebsiteTemplatePageKey)
      ? query.page
      : activeTemplate.manifest.pages[0]?.key
  ) as WebsiteTemplatePageKey;
  const tenant = {
    schoolProfileId: school.id,
    schoolName: school.name,
    institutionType: "K12" as const,
    subdomain: school.subDomain,
    customDomain: null,
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col gap-3 overflow-hidden bg-background p-3">
      <BuilderToolbar
        liveUrl={liveUrl}
        activeConfigId={activeConfig.id}
        activeStatus={activeConfigRecord.status}
        activeTemplate={activeTemplate}
        currentPage={currentPage}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <WebsiteConfigEditorClient
          config={activeConfig}
          tenant={tenant}
          initialPageKey={currentPage}
          mediaAssets={mediaAssets}
          templates={templates}
        />
      </div>
    </div>
  );
}

function BuilderToolbar({
  liveUrl,
  activeConfigId,
  activeStatus,
  activeTemplate,
  currentPage,
}: {
  liveUrl: string;
  activeConfigId?: string;
  activeStatus?: string;
  activeTemplate?: ReturnType<typeof getTemplateById>;
  currentPage?: WebsiteTemplatePageKey;
}) {
  const currentPageLabel =
    activeTemplate?.manifest.pages.find((page) => page.key === currentPage)
      ?.label ?? "Page";

  return (
    <Card className="h-12 shrink-0 bg-white">
      <CardContent className="flex h-full items-center gap-4 px-3 py-0">
        <Button asChild size="sm" variant="ghost" className="gap-2">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Dashboard
          </Link>
        </Button>

        {activeStatus ? (
          <Badge
            variant={activeStatus === "PUBLISHED" ? "default" : "secondary"}
          >
            {formatStatus(activeStatus)}
          </Badge>
        ) : (
          <Badge variant="secondary">Template setup</Badge>
        )}

        <div className="min-w-0 flex-1" />

        {activeTemplate && activeConfigId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                {currentPageLabel}
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {activeTemplate.manifest.pages.map((page) => (
                <DropdownMenuItem key={page.key} asChild>
                  <Link
                    href={`/settings/website?configId=${activeConfigId}&page=${page.key}`}
                  >
                    {page.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {activeConfigId && activeStatus !== "PUBLISHED" ? (
          <form action={publishWebsiteDraftAction}>
            <input type="hidden" name="configId" value={activeConfigId} />
            <Button type="submit" size="sm">
              Publish
            </Button>
          </form>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="More website actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {activeConfigId ? (
              <DropdownMenuItem asChild>
                <Link href={`/settings/website/${activeConfigId}/cms`}>
                  CMS Blocks
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/settings/website/media">Media</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={liveUrl} target="_blank" rel="noreferrer">
                Open Site
                <ExternalLink data-icon="inline-end" />
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!activeConfigId ? (
          <Button asChild size="sm" variant="outline">
            <a href={liveUrl} target="_blank" rel="noreferrer">
              Open Site
              <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
