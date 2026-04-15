import type {
  WebsiteTemplateContentData,
  WebsiteTenantProfile,
} from "./types";

export function createMockWebsiteContentData(
  tenant: WebsiteTenantProfile
): WebsiteTemplateContentData {
  return {
    blogPosts: [
      {
        id: "blog-1",
        slug: "welcome-to-our-campus",
        title: `Welcome to ${tenant.schoolName}`,
        excerpt: "A first look at school culture, learning spaces, and family experience.",
        body: "This article highlights the school atmosphere, academic direction, and the reasons families trust the experience.",
        imageUrl:
          "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
        publishedAt: "2026-04-08",
        category: "Campus Life",
      },
      {
        id: "blog-2",
        slug: "how-admissions-work",
        title: "How Our Admissions Journey Works",
        excerpt: "A simple guide for families moving from enquiry to confirmed enrollment.",
        body: "This article explains timelines, documents, and the next steps for prospective families.",
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
        excerpt: "Meet teachers, tour learning spaces, and ask admissions questions.",
        body: "Families are invited to explore campus, meet school leaders, and understand the student journey first-hand.",
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
        body: "Download requirements, timelines, and guidance for preparing a strong application.",
        category: "Guide",
        ctaLabel: "Download Guide",
      },
    ],
  };
}
