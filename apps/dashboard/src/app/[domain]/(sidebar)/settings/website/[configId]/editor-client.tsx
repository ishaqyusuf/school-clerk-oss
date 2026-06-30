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
import { Badge } from "@school-clerk/ui/badge";
import { Card, CardContent } from "@school-clerk/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@school-clerk/ui/field";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Separator } from "@school-clerk/ui/separator";
import { Switch } from "@school-clerk/ui/switch";
import { Textarea } from "@school-clerk/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@school-clerk/ui/tooltip";
import { useState, useTransition } from "react";
import {
  FileText,
  Layers3,
  Palette,
  Save,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
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

type TemplateOption = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  features: string[];
  pages: string[];
};

function parseObjectListValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, string> =>
        typeof item === "object" && !!item,
    );
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
            ]),
          ),
        );
      }
    } catch {}
  }

  return [];
}

function createEmptyObjectListItem(field: EditableFieldDefinition) {
  return Object.fromEntries(
    (field.itemFields ?? []).map((itemField) => [itemField.key, ""]),
  ) as Record<string, string>;
}

function updateObjectListItem(
  items: Array<Record<string, string>>,
  itemIndex: number,
  key: string,
  value: string,
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

function getScopedFieldKey(
  fieldKey: string,
  sectionEntryKey: string,
  baseSectionKey: string,
) {
  return fieldKey.startsWith(`${baseSectionKey}.`)
    ? fieldKey.replace(baseSectionKey, sectionEntryKey)
    : fieldKey;
}

const selectThemeControls: Array<
  [keyof WebsiteTemplateConfiguration["themeConfig"], string, string[]]
> = [
  ["stylePreset", "Style", []],
  ["baseColor", "Base color", ["slate", "zinc", "neutral", "stone", "taupe"]],
  ["radius", "Radius", []],
  ["density", "Density", []],
  ["iconLibrary", "Icons", ["lucide", "tabler", "phosphor"]],
  ["menuStyle", "Menu", ["default", "translucent", "solid"]],
  ["menuAccent", "Menu accent", ["subtle", "bold", "none"]],
];

const colorThemeControls: Array<
  [keyof WebsiteTemplateConfiguration["themeConfig"], string]
> = [
  ["primaryColor", "Primary"],
  ["secondaryColor", "Secondary"],
  ["accentColor", "Accent"],
  ["surfaceColor", "Surface"],
  ["theme", "Theme"],
  ["chartColor", "Chart"],
];

const fontThemeControls: Array<
  [keyof WebsiteTemplateConfiguration["themeConfig"], string]
> = [
  ["headingFont", "Heading"],
  ["bodyFont", "Font"],
];

const sidebarRailItems: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Settings2, label: "Template" },
  { icon: Palette, label: "Style" },
  { icon: Layers3, label: "Sections" },
  { icon: FileText, label: "SEO" },
];

function HiddenDraftState({
  config,
  template,
}: {
  config: WebsiteTemplateConfiguration;
  template: ReturnType<typeof getTemplateById>;
}) {
  const contentEntries = Object.entries(config.content);
  const seoEntries = Object.entries(config.seoConfig ?? {});

  return (
    <>
      <input type="hidden" name="configId" value={config.id} />
      <input type="hidden" name="name" value={config.name} />
      <input type="hidden" name="templateId" value={config.templateId} />
      <input
        type="hidden"
        name="templateVersion"
        value={String(config.templateVersion ?? 1)}
      />
      {contentEntries.map(([key, value]) => (
        <input
          key={`content-${key}`}
          type="hidden"
          name={
            typeof value === "object" && value !== null
              ? `contentJson:${key}`
              : `content:${key}`
          }
          value={
            typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value ?? "")
          }
        />
      ))}
      {seoEntries.map(([key, value]) => (
        <input
          key={`seo-${key}`}
          type="hidden"
          name={`seo:${key}`}
          value={String(value ?? "")}
        />
      ))}
      {template.manifest.pages.map((page) => {
        const order =
          config.sectionOrder?.[page.key] ??
          page.sections.map((section) => section.key);

        return (
          <div key={`sections-${page.key}`} hidden>
            <input
              type="hidden"
              name={`sectionOrder:${page.key}`}
              value={JSON.stringify(order)}
            />
            {order.map((sectionEntryKey) => {
              const baseSectionKey = getBaseSectionKey(sectionEntryKey);
              const section = page.sections.find(
                (candidate) => candidate.key === baseSectionKey,
              );
              const isVisible =
                config.sectionVisibility[sectionEntryKey] ??
                config.sectionVisibility[baseSectionKey] ??
                section?.defaultVisible ??
                true;

              return (
                <div key={sectionEntryKey}>
                  <input
                    type="hidden"
                    name="sectionKeys"
                    value={sectionEntryKey}
                  />
                  {isVisible ? (
                    <input
                      type="hidden"
                      name={`section:${sectionEntryKey}`}
                      value="on"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
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
            const previewValue = resolveMediaPreviewValue(
              itemValue,
              mediaAssets,
            );
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
                          event.target.value,
                        ),
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
                            event.target.value,
                          ),
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
                                    : asset.sourceUrl,
                                ),
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
  templates,
}: {
  tenant: WebsiteTenantProfile;
  initialPageKey: WebsiteTemplatePageKey;
  mediaAssets: MediaAsset[];
  templates: TemplateOption[];
}) {
  const editor = useWebsiteEditor();
  const [currentPage, setCurrentPage] =
    useState<WebsiteTemplatePageKey>(initialPageKey);
  const [isPending, startTransition] = useTransition();

  if (!editor) return null;

  const config = editor.config;
  const template = getTemplateById(templateRegistry, config.templateId);
  const currentTemplatePage =
    template.manifest.pages.find((page) => page.key === currentPage) ??
    template.manifest.pages[0];
  const currentPageKey = currentTemplatePage?.key ?? "home";
  const currentPageLabel = currentTemplatePage?.label ?? currentPageKey;
  const selectedTemplateOption = templates.find(
    (candidate) => candidate.id === config.templateId,
  );
  const isPublished = config.status === "published";
  const pageSections = currentTemplatePage?.sections ?? [];
  const pageSectionOrder = currentTemplatePage
    ? (config.sectionOrder?.[currentTemplatePage.key] ??
      currentTemplatePage.sections.map((section) => section.key))
    : [];

  return (
    <form action={updateWebsiteDraftEditorAction} className="h-full">
      <HiddenDraftState config={config} template={template} />

      <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-white">
          <WebsiteTemplateEditorPreview
            template={template}
            tenant={tenant}
            pageKey={currentPageKey}
            mediaAssets={mediaAssets}
          />
        </div>

        <aside className="group/sidebar absolute bottom-3 left-3 top-3 z-20 min-h-0">
          <Card className="relative flex h-full w-12 flex-col overflow-hidden bg-white/95 shadow-xl backdrop-blur transition-[width] duration-200 ease-out group-hover/sidebar:w-80 group-focus-within/sidebar:w-80">
            <TooltipProvider delayDuration={100}>
              <div className="absolute inset-y-0 left-0 z-20 flex w-12 flex-col items-center gap-2 border-r bg-white/95 py-2">
                {sidebarRailItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <div className="flex size-8 items-center justify-center rounded-md text-muted-foreground">
                          <Icon className="size-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                <div className="mt-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Save draft"
                        disabled={isPublished}
                      >
                        <Save />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Save Draft</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>

            <div className="pointer-events-none flex h-full w-80 translate-x-2 flex-col pl-12 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/sidebar:pointer-events-auto group-hover/sidebar:translate-x-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:pointer-events-auto group-focus-within/sidebar:translate-x-0 group-focus-within/sidebar:opacity-100">
              <div className="flex h-12 shrink-0 items-center border-b px-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Template Config
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {template.manifest.name}
                  </p>
                </div>
              </div>
              <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                <div className="flex flex-col gap-5 p-3">
                  <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel>Template</FieldLabel>
                    <Select
                      value={config.templateId}
                      onValueChange={(templateId) => {
                        const nextTemplate = getTemplateById(
                          templateRegistry,
                          templateId,
                        );
                        editor.setTemplate(
                          nextTemplate.manifest.id,
                          nextTemplate.manifest.defaultThemeConfig,
                        );
                        const nextPage = nextTemplate.manifest.pages[0]?.key;
                        if (nextPage) {
                          setCurrentPage(nextPage);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {templates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {selectedTemplateOption?.description ??
                        template.manifest.description}
                    </FieldDescription>
                  </Field>
                </FieldGroup>

                <Separator />

                <FieldSet>
                  <FieldLegend className="flex items-center gap-2">
                    <Palette data-icon="inline-start" />
                    Style
                  </FieldLegend>
                  <FieldGroup className="gap-4">
                    {selectThemeControls.map(
                      ([themeKey, label, fallbackOptions]) => {
                        const options =
                          themeKey === "stylePreset"
                            ? template.manifest.themeSchema.stylePresets
                            : themeKey === "radius"
                              ? template.manifest.themeSchema.radiusOptions
                              : themeKey === "density"
                                ? template.manifest.themeSchema.densityOptions
                                : fallbackOptions;

                        return (
                          <Field key={themeKey}>
                            <FieldLabel>{label}</FieldLabel>
                            <Select
                              value={String(
                                config.themeConfig[
                                  themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                                ] ?? "",
                              )}
                              onValueChange={(value) => {
                                editor.setThemeValue(
                                  themeKey as keyof WebsiteTemplateConfiguration["themeConfig"],
                                  value,
                                );
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={label} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <input
                              type="hidden"
                              name={`theme:${themeKey}`}
                              value={String(
                                config.themeConfig[
                                  themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                                ] ?? "",
                              )}
                            />
                          </Field>
                        );
                      },
                    )}

                    {colorThemeControls.map(([themeKey, label]) => (
                      <Field key={themeKey}>
                        <FieldLabel htmlFor={`theme:${themeKey}`}>
                          {label} color
                        </FieldLabel>
                        <div className="flex gap-2">
                          <Input
                            id={`theme:${themeKey}`}
                            type="color"
                            className="size-9 shrink-0 p-1"
                            value={String(
                              config.themeConfig[
                                themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                              ] ?? "#000000",
                            )}
                            onChange={(event) => {
                              editor.setThemeValue(
                                themeKey as keyof WebsiteTemplateConfiguration["themeConfig"],
                                event.target.value,
                              );
                            }}
                          />
                          <Input
                            name={`theme:${themeKey}`}
                            value={String(
                              config.themeConfig[
                                themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                              ] ?? "",
                            )}
                            onChange={(event) => {
                              editor.setThemeValue(
                                themeKey as keyof WebsiteTemplateConfiguration["themeConfig"],
                                event.target.value,
                              );
                            }}
                          />
                        </div>
                      </Field>
                    ))}

                    {fontThemeControls.map(([themeKey, label]) => (
                      <Field key={themeKey}>
                        <FieldLabel htmlFor={`theme:${themeKey}`}>
                          {label}
                        </FieldLabel>
                        <Input
                          id={`theme:${themeKey}`}
                          name={`theme:${themeKey}`}
                          value={String(
                            config.themeConfig[
                              themeKey as keyof WebsiteTemplateConfiguration["themeConfig"]
                            ] ?? "",
                          )}
                          onChange={(event) => {
                            editor.setThemeValue(
                              themeKey as keyof WebsiteTemplateConfiguration["themeConfig"],
                              event.target.value,
                            );
                          }}
                        />
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend className="flex items-center gap-2">
                    <Layers3 data-icon="inline-start" />
                    Sections
                  </FieldLegend>
                  <FieldGroup className="gap-3">
                    {pageSectionOrder.map((sectionEntryKey) => {
                      const baseSectionKey = getBaseSectionKey(sectionEntryKey);
                      const section = pageSections.find(
                        (candidate) => candidate.key === baseSectionKey,
                      );

                      if (!section || !currentTemplatePage) return null;

                      const isVisible =
                        config.sectionVisibility[sectionEntryKey] ??
                        config.sectionVisibility[section.key] ??
                        section.defaultVisible;

                      return (
                        <div
                          key={sectionEntryKey}
                          className="flex flex-col gap-4 rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium">
                                  {section.label}
                                </p>
                                {section.required ? (
                                  <Badge variant="secondary">Required</Badge>
                                ) : null}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {sectionEntryKey}
                              </p>
                            </div>
                            <Switch
                              checked={isVisible}
                              disabled={section.required}
                              onCheckedChange={(checked) => {
                                editor.setSectionVisibility(
                                  sectionEntryKey,
                                  checked,
                                );
                              }}
                            />
                          </div>

                          {section.editables.length ? (
                            <div className="flex flex-col gap-4">
                              {section.editables.map((field) => {
                                const scopedFieldKey = getScopedFieldKey(
                                  field.key,
                                  sectionEntryKey,
                                  baseSectionKey,
                                );
                                const fieldValue =
                                  config.content[scopedFieldKey];

                                return (
                                  <Field
                                    key={`${sectionEntryKey}:${field.key}`}
                                  >
                                    <FieldContent>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 flex-col gap-1">
                                          <FieldLabel htmlFor={scopedFieldKey}>
                                            {field.label}
                                          </FieldLabel>
                                          <FieldDescription>
                                            {field.description}
                                          </FieldDescription>
                                          <p className="text-xs text-muted-foreground">
                                            AI context:{" "}
                                            {field.aiDescription ??
                                              field.description}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Size: {field.sizeGuidance}
                                          </p>
                                        </div>
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
                                                      await generateWebsiteFieldAi(
                                                        {
                                                          action: "generate",
                                                          currentValue: String(
                                                            fieldValue ?? "",
                                                          ),
                                                          field,
                                                          tenant,
                                                          pageLabel:
                                                            currentPageLabel,
                                                          sectionLabel:
                                                            section.label,
                                                        },
                                                      );

                                                    editor.setFieldValue(
                                                      scopedFieldKey,
                                                      result.text,
                                                    );
                                                  });
                                                }}
                                              >
                                                <Sparkles data-icon="inline-start" />
                                                {isPending ? "Thinking" : "AI"}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Uses the field label, AI context,
                                              section, page, and current school.
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(
                                          [
                                            "shorten",
                                            "expand",
                                            "professional",
                                          ] as const
                                        ).map((action) => (
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
                                                      fieldValue ?? "",
                                                    ),
                                                    field,
                                                    tenant,
                                                    pageLabel: currentPageLabel,
                                                    sectionLabel: section.label,
                                                  });

                                                editor.setFieldValue(
                                                  scopedFieldKey,
                                                  result.text,
                                                );
                                              });
                                            }}
                                          >
                                            {action}
                                          </Button>
                                        ))}
                                      </div>
                                      {field.contentType === "short-text" ||
                                      field.contentType === "cta" ||
                                      field.contentType === "image-url" ||
                                      field.contentType === "media-asset" ? (
                                        <div className="flex flex-col gap-2">
                                          <Input
                                            id={scopedFieldKey}
                                            value={String(fieldValue ?? "")}
                                            onChange={(event) => {
                                              editor.setFieldValue(
                                                scopedFieldKey,
                                                event.target.value,
                                              );
                                            }}
                                          />
                                          {field.contentType ===
                                            "media-asset" &&
                                          getSelectedMediaAsset(
                                            fieldValue,
                                            mediaAssets,
                                          ) ? (
                                            <p className="text-xs text-muted-foreground">
                                              Selected asset:{" "}
                                              <strong>
                                                {
                                                  getSelectedMediaAsset(
                                                    fieldValue,
                                                    mediaAssets,
                                                  )?.name
                                                }
                                              </strong>
                                            </p>
                                          ) : null}
                                          {(field.contentType === "image-url" ||
                                            field.contentType ===
                                              "media-asset") &&
                                          resolveMediaPreviewValue(
                                            fieldValue,
                                            mediaAssets,
                                          ) ? (
                                            <img
                                              src={resolveMediaPreviewValue(
                                                fieldValue,
                                                mediaAssets,
                                              )}
                                              alt={field.label}
                                              className="h-28 w-full rounded-lg border object-cover"
                                            />
                                          ) : null}
                                          {(field.contentType === "image-url" ||
                                            field.contentType ===
                                              "media-asset") &&
                                          mediaAssets.length ? (
                                            <div className="flex flex-wrap gap-2">
                                              {mediaAssets
                                                .slice(0, 6)
                                                .map((asset) => (
                                                  <Button
                                                    key={asset.id}
                                                    type="button"
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => {
                                                      editor.setFieldValue(
                                                        scopedFieldKey,
                                                        field.contentType ===
                                                          "media-asset"
                                                          ? createWebsiteMediaReference(
                                                              asset.id,
                                                            )
                                                          : asset.sourceUrl,
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
                                          value={fieldValue}
                                          mediaAssets={mediaAssets}
                                          onChange={(value) => {
                                            editor.setObjectListValue(
                                              scopedFieldKey,
                                              value,
                                            );
                                          }}
                                        />
                                      ) : (
                                        <Textarea
                                          id={scopedFieldKey}
                                          value={String(fieldValue ?? "")}
                                          onChange={(event) => {
                                            editor.setFieldValue(
                                              scopedFieldKey,
                                              event.target.value,
                                            );
                                          }}
                                          rows={
                                            field.contentType === "list" ? 5 : 4
                                          }
                                        />
                                      )}
                                    </FieldContent>
                                  </Field>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              This section is powered by tenant content data and
                              has no manual text fields.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </FieldGroup>
                </FieldSet>

                {currentTemplatePage ? (
                  <>
                    <Separator />
                    <FieldSet>
                      <FieldLegend className="flex items-center gap-2">
                        <FileText data-icon="inline-start" />
                        SEO
                      </FieldLegend>
                      <FieldGroup className="gap-4">
                        {[
                          ["siteDescription", "Site description", "textarea"],
                          ["siteOgImage", "Site OG image", "input"],
                          [
                            `pages.${currentTemplatePage.key}.title`,
                            "Page title",
                            "input",
                          ],
                          [
                            `pages.${currentTemplatePage.key}.description`,
                            "Page description",
                            "textarea",
                          ],
                          [
                            `pages.${currentTemplatePage.key}.ogImage`,
                            "Page OG image",
                            "input",
                          ],
                          [
                            `pages.${currentTemplatePage.key}.canonicalUrl`,
                            "Canonical URL",
                            "input",
                          ],
                        ].map(([seoKey, label, inputType]) => (
                          <Field key={seoKey}>
                            <FieldLabel htmlFor={`seo:${seoKey}`}>
                              {label}
                            </FieldLabel>
                            {inputType === "textarea" ? (
                              <Textarea
                                id={`seo:${seoKey}`}
                                value={String(config.seoConfig?.[seoKey] ?? "")}
                                rows={seoKey === "siteDescription" ? 2 : 3}
                                onChange={(event) => {
                                  editor.setSeoValue(
                                    seoKey,
                                    event.target.value,
                                  );
                                }}
                              />
                            ) : (
                              <Input
                                id={`seo:${seoKey}`}
                                value={String(config.seoConfig?.[seoKey] ?? "")}
                                onChange={(event) => {
                                  editor.setSeoValue(
                                    seoKey,
                                    event.target.value,
                                  );
                                }}
                              />
                            )}
                          </Field>
                        ))}
                      </FieldGroup>
                    </FieldSet>
                  </>
                ) : null}
                </div>
              </CardContent>
              <div className="border-t bg-white p-3">
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" asChild>
                    <a href={`/settings/website/${config.id}/cms`}>
                      Manage CMS Blocks
                    </a>
                  </Button>
                  <Button type="submit" className="w-full" disabled={isPublished}>
                    <Save data-icon="inline-start" />
                    Save Draft
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}

export function WebsiteConfigEditorClient({
  config,
  tenant,
  initialPageKey,
  mediaAssets,
  templates,
}: {
  config: WebsiteTemplateConfiguration;
  tenant: WebsiteTenantProfile;
  initialPageKey: WebsiteTemplatePageKey;
  mediaAssets: MediaAsset[];
  templates: TemplateOption[];
}) {
  return (
    <WebsiteTemplateEditorProvider
      initialConfig={config}
      mediaAssets={mediaAssets}
    >
      <EditorForm
        tenant={tenant}
        initialPageKey={initialPageKey}
        mediaAssets={mediaAssets}
        templates={templates}
      />
    </WebsiteTemplateEditorProvider>
  );
}
