import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import {
  createWebsiteDraftAction,
  duplicateWebsiteDraftAction,
  publishWebsiteDraftAction,
} from "@/actions/website-config";
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
import { listWebsiteConfigsBySchoolProfileId, prisma } from "@school-clerk/db";
import { templateRegistry } from "@school-clerk/template-registry";
import Link from "next/link";

async function getWebsiteSettingsData(schoolId: string) {
  const [configs, school] = await Promise.all([
    listWebsiteConfigsBySchoolProfileId(schoolId),
    prisma.schoolProfile.findFirst({
      where: { id: schoolId },
      select: {
        subDomain: true,
      },
    }),
  ]);
  const templates = Array.from(templateRegistry.values()).map((template) => ({
    id: template.manifest.id,
    name: template.manifest.name,
    description: template.manifest.description,
    plans: template.manifest.supportedPlans,
    institutionTypes: template.manifest.institutionTypes,
    pages: template.manifest.pages.map((page) => page.label),
    features: template.manifest.features,
  }));

  return {
    configs,
    templates,
    schoolSubdomain: school?.subDomain ?? "greenfield",
  };
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

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

export default async function WebsiteSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; institution?: string }>;
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

  const [{ configs, templates, schoolSubdomain }, filters] = await Promise.all([
    getWebsiteSettingsData(cookie.schoolId),
    searchParams ?? Promise.resolve({}),
  ]);
  const activeFilters = filters as { plan?: string; institution?: string };
  const publishedConfig = configs.find((config) => config.status === "PUBLISHED");
  const filteredTemplates = templates.filter((template) => {
    if (activeFilters.plan && !template.plans.includes(activeFilters.plan as never))
      return false;
    if (
      activeFilters.institution &&
      !template.institutionTypes.includes(activeFilters.institution as never)
    ) {
      return false;
    }
    return true;
  });
  const comparisonTemplates = filteredTemplates.slice(0, 3);
  const previewHost =
    process.env.NODE_ENV === "production" && process.env.APP_ROOT_DOMAIN
      ? `https://${schoolSubdomain}.${process.env.APP_ROOT_DOMAIN}`
      : `http://${schoolSubdomain}.localhost:3001`;
  const publishHistory = [...configs]
    .filter((config) => config.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime()
    );

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-2">
        <PageTitle>Website</PageTitle>
        <p className="text-sm text-muted-foreground">
          Create template drafts, compare saved website configurations, and
          publish one configuration as the live public school website.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template Registry</CardTitle>
            <CardDescription>
              Start a new website draft from any available template.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant={!activeFilters.plan ? "default" : "outline"}
                size="sm"
              >
                <Link href="/settings/website">All Plans</Link>
              </Button>
              {["PLUS", "PRO", "ENTERPRISE"].map((plan) => (
                <Button
                  key={plan}
                  asChild
                  variant={activeFilters.plan === plan ? "default" : "outline"}
                  size="sm"
                >
                  <Link
                    href={`/settings/website?plan=${plan}${
                      activeFilters.institution
                        ? `&institution=${activeFilters.institution}`
                        : ""
                    }`}
                  >
                    {plan}
                  </Link>
                </Button>
              ))}
            </div>

            {filteredTemplates.map((template) => (
              <article
                key={template.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{template.name}</h3>
                        <Badge variant="secondary">{template.id}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {template.plans.map((plan) => (
                        <Badge key={plan} variant="outline">
                          {plan}
                        </Badge>
                      ))}
                      {template.institutionTypes.map((institutionType) => (
                        <Badge key={institutionType} variant="secondary">
                          {institutionType}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <p>Pages: {template.pages.join(", ")}</p>
                      <p>Features: {template.features.join(", ")}</p>
                    </div>
                  </div>

                  <form action={createWebsiteDraftAction}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <input
                      type="hidden"
                      name="templateName"
                      value={template.name}
                    />
                    <Button type="submit">Create Draft</Button>
                  </form>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compare Templates</CardTitle>
            <CardDescription>
              Side-by-side starter comparison for the current filter set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparisonTemplates.length ? (
              <div className="grid gap-3">
                {comparisonTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{template.name}</h3>
                      <Badge variant="outline">{template.id}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Pages: {template.pages.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Features: {template.features.join(", ")}
                    </p>
                    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/30">
                      <iframe
                        key={`preview-${template.id}`}
                        src={`${previewHost}/?template=${template.id}`}
                        title={`${template.name} preview`}
                        className="h-72 w-full bg-white"
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Live renderer preview using the public website app.
                    </p>
                    <form action={createWebsiteDraftAction} className="mt-3">
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="templateName" value={template.name} />
                      <Button type="submit" size="sm">
                        Start From This Template
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No templates match the current filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Website</CardTitle>
          <CardDescription>
            The currently published configuration is what <code>apps/school-site</code> will render publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {publishedConfig ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{publishedConfig.name}</h3>
                <Badge>Published</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Template: {publishedConfig.templateId}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Published{" "}
                {publishedConfig.publishedAt
                  ? new Date(publishedConfig.publishedAt).toLocaleString()
                  : "recently"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No website has been published yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved Configurations</CardTitle>
          <CardDescription>
            Drafts stay private until published. Publishing one configuration
            will make it the active live website for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {configs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No website drafts yet. Create your first draft from the template
              registry above.
            </div>
          ) : (
            configs.map((config) => (
              <article
                key={config.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{config.name}</h3>
                      <Badge
                        variant={
                          config.status === "PUBLISHED" ? "default" : "secondary"
                        }
                      >
                        {formatStatus(config.status)}
                      </Badge>
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <p>Template: {config.templateId}</p>
                      <p>Version: {config.templateVersion}</p>
                      <p>
                        Last publish{" "}
                        {config.publishedAt
                          ? new Date(config.publishedAt).toLocaleString()
                          : "not published yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/settings/website/${config.id}`}>Open Editor</Link>
                    </Button>
                    <form action={duplicateWebsiteDraftAction}>
                      <input type="hidden" name="configId" value={config.id} />
                      <Button type="submit" variant="outline">
                        Duplicate
                      </Button>
                    </form>
                    {config.status !== "PUBLISHED" ? (
                      <form action={publishWebsiteDraftAction}>
                        <input type="hidden" name="configId" value={config.id} />
                        <Button type="submit">Publish</Button>
                      </form>
                    ) : (
                      <Button disabled>Currently Live</Button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publish History</CardTitle>
          <CardDescription>
            Review recent live website changes and roll back by re-publishing a previous config.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {publishHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No publish history yet.
            </div>
          ) : (
            publishHistory.map((config) => (
              <article
                key={`history-${config.id}`}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{config.name}</h3>
                      <Badge variant={config.status === "PUBLISHED" ? "default" : "outline"}>
                        {config.status === "PUBLISHED" ? "Live Now" : "Previous Live"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Published{" "}
                      {config.publishedAt
                        ? new Date(config.publishedAt).toLocaleString()
                        : "unknown"}
                    </p>
                    {getAuditTrail(config.analyticsJson).length ? (
                      <div className="grid gap-1 pt-1">
                        <p className="text-xs text-muted-foreground">
                          Audit entries: {getAuditTrail(config.analyticsJson).length}
                        </p>
                        {getAuditTrail(config.analyticsJson)
                          .slice(-2)
                          .reverse()
                          .map((entry, index) => (
                            <p
                              key={`${entry.type ?? "entry"}-${entry.at ?? index}`}
                              className="text-xs text-muted-foreground"
                            >
                              {(entry.type ?? "change").toUpperCase()}{" "}
                              {entry.at ? new Date(entry.at).toLocaleString() : "unknown time"}
                            </p>
                          ))}
                      </div>
                    ) : null}
                  </div>
                  {config.status !== "PUBLISHED" ? (
                    <form action={publishWebsiteDraftAction}>
                      <input type="hidden" name="configId" value={config.id} />
                      <Button type="submit" variant="outline">
                        Roll Back to This Version
                      </Button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
