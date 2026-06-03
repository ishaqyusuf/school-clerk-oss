"use client";

import { generateWebsiteFieldAi } from "@/actions/website-ai";
import {
  WebsiteTemplateEditorPreview,
  WebsiteTemplateEditorProvider,
  createWebsiteMediaReference,
  getWebsiteMediaReferenceAssetId,
  getTemplateById,
  templateRegistry,
  type WebsiteMediaAsset,
  useWebsiteEditor,
  type WebsiteTemplateConfiguration,
  type WebsiteTemplatePageKey,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";
import { updateWebsiteDraftEditorAction } from "@/actions/website-config";
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
import { Textarea } from "@school-clerk/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@school-clerk/ui/tooltip";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { EditableFieldDefinition } from "@school-clerk/template-registry";

type MediaAsset = {
  id: WebsiteMediaAsset["id"];
  name: WebsiteMediaAsset["name"];
  kind: WebsiteMediaAsset["kind"];
  sourceUrl: WebsiteMediaAsset["sourceUrl"];
  altText: WebsiteMediaAsset["altText"];
  storageProvider?: WebsiteMediaAsset["storageProvider"];
  storageKey?: WebsiteMediaAsset["storageKey"];
  mimeType?: WebsiteMediaAsset["mimeType"];
};

function parseObjectListValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, string> => typeof item === "object" && !!item);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) =>
          Object.fromEntries(
            Object.entries(item ?? {}).map(([key, itemValue]) => [
              key,
              String(itemValue ?? ""),
            ])
          )
        );
      }
    } catch {}
  }

  return [];
}

function createEmptyObjectListItem(field: EditableFieldDefinition) {
  return Object.fromEntries(
    (field.itemFields ?? []).map((itemField) => [itemField.key, ""])
  ) as Record<string, string>;
}

function updateObjectListItem(
  items: Array<Record<string, string>>,
  itemIndex: number,
  key: string,
  value: string
) {
  const next = [...items];
  next[itemIndex] = {
    ...next[itemIndex],
    [key]: value,
  };
  return next;
}

function resolveMediaPreviewValue(value: unknown, mediaAssets: MediaAsset[]) {
  if (typeof value !== "string") return "";

  const assetId = getWebsiteMediaReferenceAssetId(value);
  if (!assetId) return value;

  return mediaAssets.find((asset) => asset.id === assetId)?.sourceUrl ?? value;
}

function getSelectedMediaAsset(value: unknown, mediaAssets: MediaAsset[]) {
  const assetId = getWebsiteMediaReferenceAssetId(value);
  if (!assetId) return null;
  return mediaAssets.find((asset) => asset.id === assetId) ?? null;
}

function getBaseSectionKey(sectionKey: string) {
  return sectionKey.split("__dup")[0] ?? sectionKey;
}

function getScopedFieldKey(fieldKey: string, sectionEntryKey: string, baseSectionKey: string) {
  return fieldKey.startsWith(`${baseSectionKey}.`)
    ? fieldKey.replace(baseSectionKey, sectionEntryKey)
    : fieldKey;
}

function ObjectListFieldEditor({
  field,
  value,
  mediaAssets,
  onChange,
}: {
  field: EditableFieldDefinition;
  value: unknown;
  mediaAssets: MediaAsset[];
  onChange: (value: Array<Record<string, string>>) => void;
}) {
  const items = parseObjectListValue(value);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <input
        type="hidden"
        name={`contentJson:${field.key}`}
        value={JSON.stringify(items)}
      />

      {items.map((item, itemIndex) => (
        <div
          key={`${field.key}-${itemIndex}`}
          className="space-y-3 rounded-lg border border-border p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                {field.blockPreset === "gallery" ? "Gallery Item" : "Item"}{" "}
                {itemIndex + 1}
              </p>
              {field.blockPreset === "testimonials" ? (
                <p className="text-xs text-muted-foreground">
                  Quote, speaker name, and role
                </p>
              ) : field.blockPreset === "gallery" ? (
                <p className="text-xs text-muted-foreground">
                  Card title, description, and selected image
                </p>
              ) : field.blockPreset === "feature-cards" ? (
                <p className="text-xs text-muted-foreground">
                  Title and supporting description for a value card
                </p>
              ) : field.blockPreset === "stat-cards" ? (
                <p className="text-xs text-muted-foreground">
                  Numerical value and trust-building label
                </p>
              ) : field.blockPreset === "staff-cards" ? (
                <p className="text-xs text-muted-foreground">
                  Profile card with name, role, bio, and portrait
                </p>
              ) : field.blockPreset === "announcement-cards" ? (
                <p className="text-xs text-muted-foreground">
                  Headline, summary, and date for a public update
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                onChange(items.filter((_, index) => index !== itemIndex));
              }}
            >
              Remove
            </Button>
          </div>

          {field.itemFields?.map((itemField) => {
            const itemValue = item[itemField.key] ?? "";
            const previewValue = resolveMediaPreviewValue(itemValue, mediaAssets);
            const selectedAsset = getSelectedMediaAsset(itemValue, mediaAssets);

            return (
              <div key={itemField.key} className="grid gap-2">
                <Label>{itemField.label}</Label>
                {itemField.input === "textarea" ? (
                  <Textarea
                    value={itemValue}
                    placeholder={itemField.placeholder}
                    rows={3}
                    onChange={(event) => {
                      onChange(
                        updateObjectListItem(
                          items,
                          itemIndex,
                          itemField.key,
                          event.target.value
                        )
                      );
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={itemValue}
                      placeholder={itemField.placeholder}
                      onChange={(event) => {
                        onChange(
                          updateObjectListItem(
                            items,
                            itemIndex,
                            itemField.key,
                            event.target.value
                          )
                        );
                      }}
                    />
                    {itemField.input === "media-asset" && selectedAsset ? (
                      <p className="text-xs text-muted-foreground">
                        Selected asset: <strong>{selectedAsset.name}</strong>
                      </p>
                    ) : null}
                    {(itemField.input === "image-url" ||
                      itemField.input === "media-asset") &&
                    previewValue ? (
                      <img
                        src={previewValue}
                        alt={itemField.label}
                        className="h-24 w-full rounded-lg border border-border object-cover"
                      />
                    ) : null}
                    {(itemField.input === "image-url" ||
                      itemField.input === "media-asset") &&
                    mediaAssets.length ? (
                      <div className="flex flex-wrap gap-2">
                        {mediaAssets.slice(0, 6).map((asset) => (
                          <Button
                            key={asset.id}
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              onChange(
                                updateObjectListItem(
                                  items,
                                  itemIndex,
                                  itemField.key,
                                  itemField.input === "media-asset"
                                    ? createWebsiteMediaReference(asset.id)
                                    : asset.sourceUrl
                                )
                              );
                            }}
                          >
                            Use {asset.name}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() => {
          onChange([...items, createEmptyObjectListItem(field)]);
        }}
      >
        Add{" "}
        {field.blockPreset === "gallery"
          ? "Gallery Item"
          : field.blockPreset === "feature-cards"
            ? "Feature Card"
            : field.blockPreset === "stat-cards"
              ? "Stat Card"
              : field.blockPreset === "staff-cards"
                ? "Staff Card"
                : field.blockPreset === "announcement-cards"
                  ? "Announcement"
              : "Item"}
      </Button>
    </div>
  );
}

function EditorForm({
  tenant,
  initialPageKey,
  mediaAssets,
}: {
  tenant: WebsiteTenantProfile;
  initialPageKey: WebsiteTemplatePageKey;
  mediaAssets: MediaAsset[];
}) {
  const editor = useWebsiteEditor();
  const [currentPage, setCurrentPage] = useState<WebsiteTemplatePageKey>(initialPageKey);
  const [isPending, startTransition] = useTransition();

  if (!editor) return null;

  const template = getTemplateById(templateRegistry, editor.config.templateId);
  const config = editor.config;
  const currentTemplatePage = template.manifest.pages.find(
    (page) => page.key === currentPage
  );

  const currentPageLabel =
    template.manifest.pages.find((page) => page.key === currentPage)?.label ??
    currentPage;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <form action={updateWebsiteDraftEditorAction} className="space-y-6">
        <input type="hidden" name="configId" value={config.id} />
        <input
          type="hidden"
          name="templateVersion"
          value={String(config.templateVersion ?? 1)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>
              Update the draft name and core theme tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Draft Name</Label>
              <Input
                id="name"
                name="name"
                value={config.name}
                onChange={(event) => {
                  editor.setDraftName(event.target.value);
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["primaryColor", "Primary Color"],
                ["secondaryColor", "Secondary Color"],
                ["accentColor", "Accent Color"],
                ["surfaceColor", "Surface Color"],
                ["headingFont", "Heading Font"],
                ["bodyFont", "Body Font"],
                ["radius", "Radius"],
                ["density", "Density"],
                ["stylePreset", "Style Preset"],
              ].map(([themeKey, label]) => (
                <div key={themeKey} className="grid gap-2">
                  <Label htmlFor={`theme:${themeKey}`}>{label}</Label>
                  <Input
                    id={`theme:${themeKey}`}
                    name={`theme:${themeKey}`}
                    value={String(
                      config.themeConfig[
                        themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                      ]
                    )}
                    onChange={(event) => {
                      editor.setThemeValue(
                        themeKey as keyof WebsiteTemplateConfiguration["themeConfig"],
                        event.target.value
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {template.manifest.pages.map((page) => (
          <Card key={page.key}>
            <CardHeader>
              <CardTitle className="text-base">{page.label}</CardTitle>
              <CardDescription>
                Manage editable content and section visibility for the{" "}
                {page.label.toLowerCase()} page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <input
                type="hidden"
                name={`sectionOrder:${page.key}`}
                value={JSON.stringify(
                  config.sectionOrder?.[page.key] ??
                    page.sections.map((section) => section.key)
                )}
              />
              {(config.sectionOrder?.[page.key] ??
                page.sections.map((section) => section.key)).map((sectionEntryKey) => {
                const baseSectionKey = getBaseSectionKey(sectionEntryKey);
                const section = page.sections.find(
                  (candidate) => candidate.key === baseSectionKey
                );

                if (!section) return null;

                const isVisible =
                  config.sectionVisibility[sectionEntryKey] ??
                  config.sectionVisibility[section.key] ??
                  section.defaultVisible;

                return (
                  <section
                    key={sectionEntryKey}
                    className="space-y-4 rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold">{section.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          Key: {sectionEntryKey}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="hidden"
                          name="sectionKeys"
                          value={sectionEntryKey}
                        />
                        <input
                          type="checkbox"
                          name={`section:${sectionEntryKey}`}
                          checked={isVisible}
                          onChange={(event) => {
                            editor.setSectionVisibility(
                              sectionEntryKey,
                              event.target.checked
                            );
                          }}
                          disabled={section.required}
                        />
                        <span>{section.required ? "Required" : "Visible"}</span>
                      </label>
                    </div>

                    <div className="grid gap-4">
                      {section.editables.map((field) => (
                        <div
                          key={`${sectionEntryKey}:${field.key}`}
                          className="grid gap-2"
                        >
                          {(() => {
                            const scopedFieldKey = getScopedFieldKey(
                              field.key,
                              sectionEntryKey,
                              baseSectionKey
                            );
                            return (
                              <>
                          <Label htmlFor={scopedFieldKey}>{field.label}</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {field.description} Size: {field.sizeGuidance}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => {
                                      startTransition(async () => {
                                        const result =
                                          await generateWebsiteFieldAi({
                                            action: "generate",
                                            currentValue: String(
                                              config.content[scopedFieldKey] ?? ""
                                            ),
                                            field,
                                            tenant,
                                            pageLabel: page.label,
                                            sectionLabel: section.label,
                                          });

                                        editor.setFieldValue(scopedFieldKey, result.text);
                                      });
                                    }}
                                  >
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    {isPending ? "Thinking..." : "Generate"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Generate copy from field metadata. Falls back locally if no AI key is configured.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {(["shorten", "expand", "professional"] as const).map(
                              (action) => (
                                <Button
                                  key={action}
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      const result =
                                          await generateWebsiteFieldAi({
                                            action,
                                            currentValue: String(
                                              config.content[scopedFieldKey] ?? ""
                                            ),
                                            field,
                                            tenant,
                                          pageLabel: page.label,
                                          sectionLabel: section.label,
                                        });

                                      editor.setFieldValue(scopedFieldKey, result.text);
                                    });
                                  }}
                                >
                                  {action}
                                </Button>
                              )
                            )}
                          </div>
                          {field.contentType === "short-text" ||
                          field.contentType === "cta" ||
                          field.contentType === "image-url" ||
                          field.contentType === "media-asset" ? (
                            <div className="space-y-2">
                              <Input
                                id={scopedFieldKey}
                                name={`content:${scopedFieldKey}`}
                                value={String(config.content[scopedFieldKey] ?? "")}
                                onChange={(event) => {
                                  editor.setFieldValue(
                                    scopedFieldKey,
                                    event.target.value
                                  );
                                }}
                              />
                              {field.contentType === "media-asset" ? (
                                <div className="space-y-2">
                                  {getSelectedMediaAsset(
                                    config.content[scopedFieldKey],
                                    mediaAssets
                                  ) ? (
                                    <p className="text-xs text-muted-foreground">
                                      Selected asset:{" "}
                                      <strong>
                                        {
                                          getSelectedMediaAsset(
                                            config.content[scopedFieldKey],
                                            mediaAssets
                                          )?.name
                                        }
                                      </strong>
                                    </p>
                                  ) : null}
                                  {resolveMediaPreviewValue(
                                    config.content[scopedFieldKey],
                                    mediaAssets
                                  ) ? (
                                    <img
                                      src={resolveMediaPreviewValue(
                                        config.content[scopedFieldKey],
                                        mediaAssets
                                      )}
                                      alt={field.label}
                                      className="h-28 w-full rounded-lg border border-border object-cover"
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                              {(field.contentType === "image-url" ||
                                field.contentType === "media-asset") &&
                              mediaAssets.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {mediaAssets.slice(0, 6).map((asset) => (
                                    <Button
                                      key={asset.id}
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => {
                                        editor.setFieldValue(
                                          scopedFieldKey,
                                          field.contentType === "media-asset"
                                            ? createWebsiteMediaReference(asset.id)
                                            : asset.sourceUrl
                                        );
                                      }}
                                    >
                                      Use {asset.name}
                                    </Button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : field.contentType === "object-list" &&
                            field.itemFields?.length ? (
                            <ObjectListFieldEditor
                              field={field}
                              value={config.content[scopedFieldKey]}
                              mediaAssets={mediaAssets}
                              onChange={(value) => {
                                editor.setObjectListValue(scopedFieldKey, value);
                              }}
                            />
                          ) : (
                            <Textarea
                              id={scopedFieldKey}
                              name={`content:${scopedFieldKey}`}
                              value={String(config.content[scopedFieldKey] ?? "")}
                              onChange={(event) => {
                                editor.setFieldValue(
                                  scopedFieldKey,
                                  event.target.value
                                );
                              }}
                              rows={field.contentType === "list" ? 5 : 4}
                            />
                          )}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              <section className="space-y-4 rounded-xl border border-border p-4">
                <div>
                  <h3 className="text-sm font-semibold">SEO</h3>
                  <p className="text-xs text-muted-foreground">
                    Page-level metadata for this route.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="seo:siteDescription">Site Description</Label>
                    <Textarea
                      id="seo:siteDescription"
                      name="seo:siteDescription"
                      defaultValue={String(
                        (config.seoConfig?.siteDescription as string) ?? ""
                      )}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="seo:siteOgImage">Site OG Image</Label>
                    <Input
                      id="seo:siteOgImage"
                      name="seo:siteOgImage"
                      defaultValue={String(
                        (config.seoConfig?.siteOgImage as string) ?? ""
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`seo:${page.key}.title`}>SEO Title</Label>
                    <Input
                      id={`seo:${page.key}.title`}
                      name={`seo:pages.${page.key}.title`}
                      defaultValue={String(
                        (config.seoConfig?.[`pages.${page.key}.title`] as string) ??
                          ""
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`seo:${page.key}.description`}>
                      SEO Description
                    </Label>
                    <Textarea
                      id={`seo:${page.key}.description`}
                      name={`seo:pages.${page.key}.description`}
                      defaultValue={String(
                        (config.seoConfig?.[
                          `pages.${page.key}.description`
                        ] as string) ?? ""
                      )}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`seo:${page.key}.ogImage`}>OG Image</Label>
                    <Input
                      id={`seo:${page.key}.ogImage`}
                      name={`seo:pages.${page.key}.ogImage`}
                      defaultValue={String(
                        (config.seoConfig?.[`pages.${page.key}.ogImage`] as string) ??
                          ""
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`seo:${page.key}.canonicalUrl`}>
                      Canonical URL
                    </Label>
                    <Input
                      id={`seo:${page.key}.canonicalUrl`}
                      name={`seo:pages.${page.key}.canonicalUrl`}
                      defaultValue={String(
                        (config.seoConfig?.[
                          `pages.${page.key}.canonicalUrl`
                        ] as string) ?? ""
                      )}
                    />
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button type="submit">Save Draft</Button>
        </div>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>
              Click highlighted text directly in the preview to edit it inline, and use image overlays to swap media without leaving the canvas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {template.manifest.pages.map((page) => (
                <Button
                  key={page.key}
                  type="button"
                  variant={page.key === currentPage ? "default" : "outline"}
                  onClick={() => setCurrentPage(page.key)}
                >
                  {page.label}
                </Button>
              ))}
            </div>

            {currentTemplatePage ? (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Editing preview for <strong>{currentTemplatePage.label}</strong>. Side-panel
                fields, inline edits, section frames, and local AI actions stay in sync.
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <WebsiteTemplateEditorPreview
                template={template}
                tenant={tenant}
                pageKey={currentPage}
                mediaAssets={mediaAssets}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function WebsiteConfigEditorClient({
  config,
  tenant,
  initialPageKey,
  mediaAssets,
}: {
  config: WebsiteTemplateConfiguration;
  tenant: WebsiteTenantProfile;
  initialPageKey: WebsiteTemplatePageKey;
  mediaAssets: MediaAsset[];
}) {
  return (
    <WebsiteTemplateEditorProvider initialConfig={config} mediaAssets={mediaAssets}>
      <EditorForm
        tenant={tenant}
        initialPageKey={initialPageKey}
        mediaAssets={mediaAssets}
      />
    </WebsiteTemplateEditorProvider>
  );
}
