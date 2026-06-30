import type {
  WebsiteCollectionItem,
  WebsiteTemplateConfiguration,
  WebsiteTemplateContentData,
  WebsiteTenantProfile,
} from "./types";

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

  if (typeof value === "string" && value.trim()) {
    try {
      return getObjectList(JSON.parse(value));
    } catch {}
  }

  return [];
}

function toCollectionItems(
  items: Array<Record<string, string>>,
  prefix: string,
): WebsiteCollectionItem[] {
  return items.reduce<WebsiteCollectionItem[]>((collection, item, index) => {
    const title = item.title?.trim();
    if (!title) return collection;

    collection.push({
      id: item.id || `${prefix}-${index + 1}`,
      slug: item.slug?.trim() || slugify(title),
      title,
      excerpt: item.excerpt || item.description || "",
      body: item.body || item.description || item.excerpt || "",
      imageUrl: item.imageUrl || undefined,
      publishedAt: item.publishedAt || item.date || undefined,
      category: item.category || undefined,
      ctaLabel: item.ctaLabel || undefined,
    });

    return collection;
  }, []);
}

export function createMockWebsiteContentData(
  tenant: WebsiteTenantProfile,
): WebsiteTemplateContentData {
  return {
    announcements: [
      {
        id: "announcement-1",
        slug: "open-day-registration",
        title: `${tenant.schoolName} Open Day Registration Now Live`,
        excerpt:
          "Families can reserve a place for campus tours, classroom visits, and admissions conversations.",
        body: "Families can reserve a place for campus tours, classroom visits, and admissions conversations. The visit is designed to help parents understand the school culture, class placement process, and next steps.",
        publishedAt: "2026-05-12",
        category: "Admissions",
        ctaLabel: "Reserve a Visit",
      },
      {
        id: "announcement-2",
        slug: "scholarship-screening",
        title: "Scholarship Screening Window Opens",
        excerpt:
          "Application instructions and eligibility guidance are now available for interested families.",
        body: "Application instructions, screening dates, eligibility guidance, and required documents are now available for interested families preparing for the next admissions cycle.",
        publishedAt: "2026-06-03",
        category: "Scholarships",
        ctaLabel: "Learn More",
      },
    ],
    admissionLinks: [
      {
        id: "admission-link-1",
        title: `${tenant.schoolName} Admissions`,
        href: "/enroll/demo-admission",
        classroomCount: 4,
        classroomLabels: ["Nursery", "Primary 1", "Primary 2", "JSS 1"],
        opensAt: "2026-06-01",
        closesAt: "2026-09-15",
        instructions:
          "Choose a class, review the requirements, and submit the admission form online.",
      },
    ],
    blogPosts: [
      {
        id: "blog-1",
        slug: "welcome-to-our-campus",
        title: `Welcome to ${tenant.schoolName}`,
        excerpt:
          "A first look at school culture, learning spaces, and the family experience.",
        body: `${tenant.schoolName} is shaped by attentive teachers, structured academics, and a warm campus culture. This story introduces the learning spaces, daily routines, and values families can expect when they visit.`,
        imageUrl:
          "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
        publishedAt: "2026-04-08",
        category: "Campus Life",
      },
      {
        id: "blog-2",
        slug: "how-admissions-work",
        title: "How Our Admissions Journey Works",
        excerpt:
          "A simple guide for families moving from enquiry to confirmed enrollment.",
        body: "This guide explains how families can book a visit, prepare application documents, meet the admissions team, and understand class placement before enrollment is confirmed.",
        imageUrl:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
        publishedAt: "2026-04-05",
        category: "Admissions",
      },
    ],
    events: [
      {
        id: "event-1",
        slug: "open-day-2026",
        title: "Open Day 2026",
        excerpt:
          "Meet teachers, tour learning spaces, and ask admissions questions.",
        body: `Families are invited to explore ${tenant.schoolName}, meet school leaders, visit classrooms, and understand the student journey first-hand.`,
        imageUrl:
          "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
        publishedAt: "2026-05-12",
        category: "Admissions Event",
      },
    ],
    resources: [
      {
        id: "resource-1",
        slug: "admissions-checklist",
        title: "Admissions Checklist",
        excerpt: "Everything families need before starting an application.",
        body: "Review required documents, key dates, class placement notes, and guidance for preparing a complete school application.",
        category: "Guide",
        ctaLabel: "Download Guide",
      },
    ],
  };
}

export function createWebsiteContentDataFromConfig(
  tenant: WebsiteTenantProfile,
  config?: WebsiteTemplateConfiguration | null,
  options: { includeFallback?: boolean } = {},
): WebsiteTemplateContentData {
  const fallback = createMockWebsiteContentData(tenant);
  const empty: WebsiteTemplateContentData = {
    announcements: [],
    admissionLinks: [],
    blogPosts: [],
    events: [],
    resources: [],
  };
  const fallbackData = options.includeFallback === false ? empty : fallback;
  const content = config?.content ?? {};
  const announcements = toCollectionItems(
    getObjectList(content["cms.announcements"]),
    "announcement",
  );
  const blogPosts = toCollectionItems(
    getObjectList(content["cms.blogPosts"]),
    "blog",
  );
  const events = toCollectionItems(getObjectList(content["cms.events"]), "event");
  const resources = toCollectionItems(
    getObjectList(content["cms.resources"]),
    "resource",
  );

  return {
    ...fallbackData,
    announcements: announcements.length
      ? announcements
      : fallbackData.announcements,
    admissionLinks: fallbackData.admissionLinks,
    blogPosts: blogPosts.length ? blogPosts : fallbackData.blogPosts,
    events: events.length ? events : fallbackData.events,
    resources: resources.length ? resources : fallbackData.resources,
  };
}
