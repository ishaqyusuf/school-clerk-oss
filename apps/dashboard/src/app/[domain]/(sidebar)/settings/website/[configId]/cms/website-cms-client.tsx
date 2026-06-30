"use client";

import { updateWebsiteCmsAction } from "@/actions/website-config";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@school-clerk/ui/field";
import { Input } from "@school-clerk/ui/input";
import { Separator } from "@school-clerk/ui/separator";
import { Textarea } from "@school-clerk/ui/textarea";
import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type CmsItem = Record<string, string>;
type CmsItemType = "announcement" | "blog" | "event" | "resource";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "school-update"
  );
}

function createAnnouncement(): CmsItem {
  return {
    title: "New school announcement",
    slug: "new-school-announcement",
    category: "School Update",
    date: new Date().toISOString().slice(0, 10),
    description: "Share a short public update for families.",
    ctaLabel: "Read More",
  };
}

function createBlogPost(): CmsItem {
  return {
    title: "New school story",
    slug: "new-school-story",
    category: "Campus Life",
    publishedAt: new Date().toISOString().slice(0, 10),
    excerpt: "Write a short summary for the blog list and homepage block.",
    body: "Write the full blog story here.",
    imageUrl: "",
    ctaLabel: "Read Story",
  };
}

function createEvent(): CmsItem {
  return {
    title: "New school event",
    slug: "new-school-event",
    category: "School Event",
    publishedAt: new Date().toISOString().slice(0, 10),
    excerpt: "Share the event purpose, audience, and important details.",
    body:
      "Write the full event details here, including timing, location, and what families should prepare.",
    imageUrl: "",
    ctaLabel: "View Event",
  };
}

function createResource(): CmsItem {
  return {
    title: "New family resource",
    slug: "new-family-resource",
    category: "Family Guide",
    publishedAt: new Date().toISOString().slice(0, 10),
    excerpt: "Summarize the document or guidance for families.",
    body:
      "Write the full resource guidance here, or describe what families should download or prepare.",
    imageUrl: "",
    ctaLabel: "Open Resource",
  };
}

function updateItem(
  items: CmsItem[],
  index: number,
  key: string,
  value: string,
) {
  return items.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const next = { ...item, [key]: value };

    if (
      key === "title" &&
      (!item.slug || item.slug === slugify(item.title ?? ""))
    ) {
      next.slug = slugify(value);
    }

    return next;
  });
}

function CmsItemEditor({
  type,
  item,
  index,
  readOnly = false,
  onChange,
  onRemove,
}: {
  type: CmsItemType;
  item: CmsItem;
  index: number;
  readOnly?: boolean;
  onChange: (key: string, value: string) => void;
  onRemove: () => void;
}) {
  const isAnnouncement = type === "announcement";
  const typeLabel =
    type === "blog"
      ? "Blog post"
      : type === "event"
        ? "Event"
        : type === "resource"
          ? "Resource"
          : "Announcement";

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {typeLabel} {index + 1}
            </Badge>
            {item.category ? (
              <Badge variant="outline">{item.category}</Badge>
            ) : null}
          </div>
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">/{item.slug}</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={readOnly}
          onClick={onRemove}
        >
          <Trash2 data-icon="inline-start" />
          <span className="sr-only">Remove block</span>
        </Button>
      </div>

      <FieldGroup className="gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              disabled={readOnly}
              value={item.title ?? ""}
              onChange={(event) => onChange("title", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Slug</FieldLabel>
            <Input
              disabled={readOnly}
              value={item.slug ?? ""}
              onChange={(event) =>
                onChange("slug", slugify(event.target.value))
              }
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Category</FieldLabel>
            <Input
              disabled={readOnly}
              value={item.category ?? ""}
              onChange={(event) => onChange("category", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>
              {isAnnouncement ? "Date" : "Published date"}
            </FieldLabel>
            <Input
              disabled={readOnly}
              type="date"
              value={(item.publishedAt || item.date || "").slice(0, 10)}
              onChange={(event) =>
                onChange(
                  isAnnouncement ? "date" : "publishedAt",
                  event.target.value,
                )
              }
            />
          </Field>
        </div>
        {!isAnnouncement ? (
          <Field>
            <FieldLabel>Image URL</FieldLabel>
            <Input
              disabled={readOnly}
              value={item.imageUrl ?? ""}
              onChange={(event) => onChange("imageUrl", event.target.value)}
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel>{isAnnouncement ? "Description" : "Excerpt"}</FieldLabel>
          <Textarea
            disabled={readOnly}
            rows={3}
            value={
              isAnnouncement ? (item.description ?? "") : (item.excerpt ?? "")
            }
            onChange={(event) =>
              onChange(
                isAnnouncement ? "description" : "excerpt",
                event.target.value,
              )
            }
          />
          <FieldDescription>
            This text appears in cards, listing pages, and metadata fallbacks.
          </FieldDescription>
        </Field>
        {!isAnnouncement ? (
          <Field>
            <FieldLabel>Body</FieldLabel>
            <Textarea
              disabled={readOnly}
              rows={7}
              value={item.body ?? ""}
              onChange={(event) => onChange("body", event.target.value)}
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel>CTA label</FieldLabel>
          <Input
            disabled={readOnly}
            value={item.ctaLabel ?? ""}
            onChange={(event) => onChange("ctaLabel", event.target.value)}
          />
        </Field>
      </FieldGroup>
    </div>
  );
}

export function WebsiteCmsClient({
  configId,
  readOnly = false,
  initialAnnouncements,
  initialBlogPosts,
  initialEvents,
  initialResources,
}: {
  configId: string;
  readOnly?: boolean;
  initialAnnouncements: CmsItem[];
  initialBlogPosts: CmsItem[];
  initialEvents: CmsItem[];
  initialResources: CmsItem[];
}) {
  const [announcements, setAnnouncements] = useState<CmsItem[]>(
    initialAnnouncements.length ? initialAnnouncements : [createAnnouncement()],
  );
  const [blogPosts, setBlogPosts] = useState<CmsItem[]>(
    initialBlogPosts.length ? initialBlogPosts : [createBlogPost()],
  );
  const [events, setEvents] = useState<CmsItem[]>(
    initialEvents.length ? initialEvents : [createEvent()],
  );
  const [resources, setResources] = useState<CmsItem[]>(
    initialResources.length ? initialResources : [createResource()],
  );
  const counts = useMemo(
    () => ({
      announcements: announcements.filter((item) => item.title?.trim()).length,
      blogPosts: blogPosts.filter((item) => item.title?.trim()).length,
      events: events.filter((item) => item.title?.trim()).length,
      resources: resources.filter((item) => item.title?.trim()).length,
    }),
    [announcements, blogPosts, events, resources],
  );

  return (
    <form action={updateWebsiteCmsAction} className="flex flex-col gap-8">
      <input type="hidden" name="configId" value={configId} />
      <input
        type="hidden"
        name="cms.announcements"
        value={JSON.stringify(announcements)}
      />
      <input
        type="hidden"
        name="cms.blogPosts"
        value={JSON.stringify(blogPosts)}
      />
      <input type="hidden" name="cms.events" value={JSON.stringify(events)} />
      <input
        type="hidden"
        name="cms.resources"
        value={JSON.stringify(resources)}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">
            {counts.announcements} announcements
          </p>
          <p className="text-xs text-muted-foreground">
            Header strip and homepage announcement blocks.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{counts.blogPosts} blog posts</p>
          <p className="text-xs text-muted-foreground">
            Homepage blog block, blog page, and blog details.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{counts.events} events</p>
          <p className="text-xs text-muted-foreground">
            Events page and event details.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">{counts.resources} resources</p>
          <p className="text-xs text-muted-foreground">
            Resources page and resource details.
          </p>
        </div>
      </div>

      <FieldSet>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <FieldLegend>Announcements</FieldLegend>
            <FieldDescription>
              Use these for the announcement header and announcement section.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              setAnnouncements((current) => [...current, createAnnouncement()])
            }
          >
            <Plus data-icon="inline-start" />
            Add announcement
          </Button>
        </div>
        <div className="grid gap-4">
          {announcements.map((item, index) => (
            <CmsItemEditor
              key={`${item.slug}-${index}`}
              type="announcement"
              item={item}
              index={index}
              readOnly={readOnly}
              onChange={(key, value) => {
                setAnnouncements((current) =>
                  updateItem(current, index, key, value),
                );
              }}
              onRemove={() => {
                setAnnouncements((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                );
              }}
            />
          ))}
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <FieldLegend>Events</FieldLegend>
            <FieldDescription>
              Use these for the public events listing and event detail pages.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            onClick={() => setEvents((current) => [...current, createEvent()])}
          >
            <Plus data-icon="inline-start" />
            Add event
          </Button>
        </div>
        <div className="grid gap-4">
          {events.map((item, index) => (
            <CmsItemEditor
              key={`${item.slug}-${index}`}
              type="event"
              item={item}
              index={index}
              readOnly={readOnly}
              onChange={(key, value) => {
                setEvents((current) => updateItem(current, index, key, value));
              }}
              onRemove={() => {
                setEvents((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                );
              }}
            />
          ))}
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <FieldLegend>Resources</FieldLegend>
            <FieldDescription>
              Use these for family guides, admissions forms, calendars, and
              public resource detail pages.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              setResources((current) => [...current, createResource()])
            }
          >
            <Plus data-icon="inline-start" />
            Add resource
          </Button>
        </div>
        <div className="grid gap-4">
          {resources.map((item, index) => (
            <CmsItemEditor
              key={`${item.slug}-${index}`}
              type="resource"
              item={item}
              index={index}
              readOnly={readOnly}
              onChange={(key, value) => {
                setResources((current) =>
                  updateItem(current, index, key, value),
                );
              }}
              onRemove={() => {
                setResources((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                );
              }}
            />
          ))}
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <FieldLegend>Blog Posts</FieldLegend>
            <FieldDescription>
              Use these for the homepage blog section, blog listing, and detail
              pages.
            </FieldDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={readOnly}
            onClick={() =>
              setBlogPosts((current) => [...current, createBlogPost()])
            }
          >
            <Plus data-icon="inline-start" />
            Add post
          </Button>
        </div>
        <div className="grid gap-4">
          {blogPosts.map((item, index) => (
            <CmsItemEditor
              key={`${item.slug}-${index}`}
              type="blog"
              item={item}
              index={index}
              readOnly={readOnly}
              onChange={(key, value) => {
                setBlogPosts((current) =>
                  updateItem(current, index, key, value),
                );
              }}
              onRemove={() => {
                setBlogPosts((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                );
              }}
            />
          ))}
        </div>
      </FieldSet>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={readOnly}>
          <Save data-icon="inline-start" />
          Save CMS Blocks
        </Button>
      </div>
    </form>
  );
}
