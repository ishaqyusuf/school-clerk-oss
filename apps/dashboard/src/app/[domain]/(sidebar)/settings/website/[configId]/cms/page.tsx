import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { getWebsiteConfigById } from "@school-clerk/db";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { notFound } from "next/navigation";
import { WebsiteCmsClient } from "./website-cms-client";
import { getWebsiteManagementContext } from "@/lib/website/access";

function getObjectList(value: unknown): Array<Record<string, string>> {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && !!item,
      )
      .map((item) =>
        Object.fromEntries(
          Object.entries(item).map(([key, itemValue]) => [
            key,
            String(itemValue ?? ""),
          ]),
        ),
      );
  }

  return [];
}

export default async function WebsiteCmsPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const [{ configId }, cookie] = await Promise.all([params, getAuthCookie()]);

  if (!cookie?.schoolId) {
    notFound();
  }

  const context = await getWebsiteManagementContext(cookie);

  if (!context || !["ADMIN", "Admin"].includes(context.role ?? "")) {
    notFound();
  }

  const config = await getWebsiteConfigById({
    id: configId,
    schoolProfileId: cookie.schoolId,
  });

  if (!config) {
    notFound();
  }

  const content =
    typeof config.contentJson === "object" && config.contentJson
      ? (config.contentJson as Record<string, unknown>)
      : {};

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <PageTitle>Website CMS</PageTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Manage reusable public school-site content for announcements, blog
            posts, events, and family resources. These blocks feed the selected
            template and replace dummy content wherever available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/settings/website/${configId}`}>Back to Template</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Block Library</CardTitle>
          <CardDescription>
            Announcements can power header strips and homepage announcement
            sections. Blog posts, events, and resources power their public
            listing and detail pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebsiteCmsClient
            configId={configId}
            readOnly={config.status === "PUBLISHED"}
            initialAnnouncements={getObjectList(content["cms.announcements"])}
            initialBlogPosts={getObjectList(content["cms.blogPosts"])}
            initialEvents={getObjectList(content["cms.events"])}
            initialResources={getObjectList(content["cms.resources"])}
          />
        </CardContent>
      </Card>
    </div>
  );
}
