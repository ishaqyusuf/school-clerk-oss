import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import {
  createWebsiteMediaAssetAction,
  uploadWebsiteMediaAssetAction,
} from "@/actions/website-media";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { listWebsiteMediaAssetsBySchoolProfileId } from "@school-clerk/db";

export default async function WebsiteMediaPage() {
  const cookie = await getAuthCookie();

  if (!cookie?.schoolId) {
    return (
      <div className="py-8">
        <PageTitle>Website Media</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenant context not found. Refresh the page and try again.
        </p>
      </div>
    );
  }

  const assets = await listWebsiteMediaAssetsBySchoolProfileId(cookie.schoolId);

  return (
    <div className="space-y-6 py-4">
      <div>
        <PageTitle>Website Media</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Import image assets into a tenant-owned media library for reuse across website templates.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Asset</CardTitle>
            <CardDescription>
              Upload images to Vercel Blob so templates can reuse tenant-owned media across drafts and the live site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              action={uploadWebsiteMediaAssetAction}
              className="space-y-4"
              encType="multipart/form-data"
            >
              <div className="grid gap-2">
                <Label htmlFor="file">Image File</Label>
                <Input id="file" name="file" type="file" accept="image/*" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upload-name">Name</Label>
                <Input
                  id="upload-name"
                  name="name"
                  placeholder="Campus Hero"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upload-altText">Alt Text</Label>
                <Input
                  id="upload-altText"
                  name="altText"
                  placeholder="Students in the school courtyard"
                />
              </div>
              <Button type="submit">Upload to Blob</Button>
            </form>

            <div className="border-t border-border pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Import External URL</h3>
                <p className="text-xs text-muted-foreground">
                  Keep URL import as a fallback for images that already live elsewhere.
                </p>
              </div>

              <form action={createWebsiteMediaAssetAction} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Campus Hero" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  name="sourceUrl"
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="altText">Alt Text</Label>
                <Input
                  id="altText"
                  name="altText"
                  placeholder="Students in the school courtyard"
                />
              </div>
              <Button type="submit">Add Asset</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Library</CardTitle>
            <CardDescription>
              Imported assets available for selection in the website editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {assets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No media assets yet. Import your first website image.
              </div>
            ) : (
              assets.map((asset) => (
                <article
                  key={asset.id}
                  className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-[160px,1fr]"
                >
                  <img
                    src={asset.sourceUrl}
                    alt={asset.altText ?? asset.name}
                    className="h-36 w-full rounded-lg object-cover"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{asset.name}</h3>
                      {asset.storageProvider ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {asset.storageProvider}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{asset.sourceUrl}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.altText || "No alt text set"}
                    </p>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
