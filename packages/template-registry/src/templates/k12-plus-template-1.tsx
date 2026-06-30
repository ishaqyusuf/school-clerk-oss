import { EditableMedia } from "../components/editable-media";
import { EditableText } from "../components/editable-text";
import { SectionFrame } from "../components/section-frame";
import { AdmissionLinksSection } from "../features/admissions/admission-links-section";
import {
  PageShell,
  RepeatableAddButton,
  RepeatableItemActions,
} from "./k12-plus-template-1-client";
import {
  createAnnouncementCardBlockField,
  createFeatureCardBlockField,
  createGalleryBlockField,
  createStaffCardBlockField,
  createStatCardBlockField,
  createTestimonialBlockField,
} from "../block-presets";
import type {
  WebsiteCollectionItem,
  WebsiteTemplateDefinition,
  WebsiteTemplateRenderContext,
} from "../types";
import { defineWebsiteTemplate } from "../registry";
import type { CSSProperties } from "react";

type WebsiteCollectionKey =
  | "announcements"
  | "blogPosts"
  | "events"
  | "resources";

function getCopy(context: WebsiteTemplateRenderContext, key: string, fallback: string) {
  const value = context.config.content[key];
  return typeof value === "string" ? value : fallback;
}

function getList(context: WebsiteTemplateRenderContext, key: string, fallback: string[]) {
  const value = context.config.content[key];

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function getObjectList(
  context: WebsiteTemplateRenderContext,
  key: string,
  fallback: Array<Record<string, string>>
) {
  const value = context.config.content[key];

  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && !!item)
      .map((item) =>
        Object.fromEntries(
          Object.entries(item).map(([itemKey, itemValue]) => [itemKey, String(itemValue ?? "")])
        )
      );
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is Record<string, unknown> => typeof item === "object" && !!item)
          .map((item) =>
            Object.fromEntries(
              Object.entries(item).map(([itemKey, itemValue]) => [itemKey, String(itemValue ?? "")])
            )
          );
      }
    } catch {}
  }

  return fallback;
}

function isSectionVisible(
  context: WebsiteTemplateRenderContext,
  sectionKey: string,
  defaultVisible = true
) {
  return context.config.sectionVisibility[sectionKey] ?? defaultVisible;
}

function getBaseSectionKey(sectionKey: string) {
  return sectionKey.split("__dup")[0] ?? sectionKey;
}

function getPageSectionOrder(
  context: WebsiteTemplateRenderContext,
  pageKey: string,
  fallback: string[]
) {
  return context.config.sectionOrder?.[pageKey] ?? fallback;
}

function getScopedContentKey(sectionEntryKey: string, suffix: string) {
  return `${sectionEntryKey}.${suffix}`;
}

function getCollectionItems(
  context: WebsiteTemplateRenderContext,
  collection: WebsiteCollectionKey
): WebsiteCollectionItem[] {
  return context.contentData?.[collection] ?? [];
}

function getCollectionItem(
  items: WebsiteCollectionItem[],
  slug: string | null | undefined
) {
  return items.find((item) => item.slug === slug) ?? null;
}

function collectionToAnnouncementCards(items: WebsiteCollectionItem[]) {
  return items.map((item) => ({
    date: item.publishedAt ?? "",
    title: item.title,
    description: item.excerpt,
  }));
}

function HomePage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "home.hero", true)) {
    return null;
  }

  const orderedHomeSections = getPageSectionOrder(context, "home", [
    "home.features",
    "home.stats",
    "home.staff",
    "home.admissions",
    "home.announcements",
  ]);

  return (
    <SectionFrame mode={context.mode} sectionKey="home.hero" label="Hero Section">
      <PageShell
        context={context}
        eyebrow={getCopy(context, "home.hero.kicker", "Admissions Open")}
        title={getCopy(
          context,
          "home.hero.title",
          `Welcome to ${context.tenant.schoolName}, where every child is known and challenged.`
        )}
        body={getCopy(
          context,
          "home.hero.body",
          "Discover a caring school community with strong academics, attentive teachers, and a clear path from first enquiry to confident enrollment."
        )}
        cta={getCopy(context, "home.hero.cta", "Start Admission Enquiry")}
        imageUrl={getCopy(
          context,
          "home.hero.imageUrl",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
        )}
        highlights={getList(context, "home.hero.highlights", [
          "Small classes and personal attention",
          "Clear admissions support",
          "A safe, joyful campus culture",
        ])}
        testimonials={getObjectList(context, "home.hero.testimonials", [
          {
            quote:
              "Our children are known by name, encouraged by their teachers, and excited to talk about what they learn each day.",
            name: "Parent Family",
            role: "School Community",
          },
          {
            quote:
              "The school combines academic structure with the warmth families hope to find when choosing a place for their children.",
            name: "School Leadership",
            role: "Leadership Team",
          },
        ])}
        gallery={getObjectList(context, "home.hero.gallery", [
          {
            title: "Campus Welcome",
            description: "Families are welcomed into calm learning spaces, friendly classrooms, and a community built around student growth.",
            imageUrl:
              "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
          },
          {
            title: "Learning Spaces",
            description: "Classrooms, libraries, and activity spaces support focused learning, collaboration, and creativity.",
            imageUrl:
              "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
          },
        ])}
      >
        {orderedHomeSections.map((sectionEntryKey) => {
          const baseSectionKey = getBaseSectionKey(sectionEntryKey);

          if (
            baseSectionKey === "home.features" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            return (
              <SectionFrame
                key={sectionEntryKey}
                mode={context.mode}
                sectionKey={sectionEntryKey}
                pageKey="home"
                label="Feature Cards"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 18,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    marginBottom: 24,
                  }}
                >
                  {(
                    getObjectList(
                      context,
                      getScopedContentKey(sectionEntryKey, "cards"),
                      getObjectList(context, "home.features.cards", [
                        {
                          title: "A strong academic foundation",
                          description:
                            "Students build confidence in literacy, numeracy, science, humanities, and creative learning through a balanced curriculum.",
                        },
                        {
                          title: "Teachers who know each learner",
                          description:
                            "Class teams pay attention to progress, character, and wellbeing so every child receives the support they need.",
                        },
                        {
                          title: "A clear journey for families",
                          description:
                            "From enquiry to enrollment, families receive practical guidance, transparent next steps, and warm communication.",
                        },
                      ])
                    )
                  ).map((item, index) => (
                    <article
                      key={`${sectionEntryKey}-${item.title ?? "feature"}-${index}`}
                      style={{
                        position: "relative",
                        background: "#ffffff",
                        borderRadius: 24,
                        border: "1px solid rgba(15, 76, 129, 0.12)",
                        padding: 20,
                        boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
                      }}
                    >
                      <RepeatableItemActions
                        mode={context.mode}
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        itemIndex={index}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="title"
                        fallback={item.title || ""}
                        mode={context.mode}
                        style={{ margin: 0, fontSize: 18, fontWeight: 700 }}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="description"
                        fallback={item.description || ""}
                        mode={context.mode}
                        style={{
                          margin: "10px 0 0",
                          color: "#64748b",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      />
                    </article>
                  ))}
                </div>
                <RepeatableAddButton
                  mode={context.mode}
                  objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                  preset="feature-cards"
                  label="Feature Card"
                />
              </SectionFrame>
            );
          }

          if (
            baseSectionKey === "home.stats" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            return (
              <SectionFrame
                key={sectionEntryKey}
                mode={context.mode}
                sectionKey={sectionEntryKey}
                pageKey="home"
                label="Stats"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    marginBottom: 24,
                  }}
                >
                  {(
                    getObjectList(
                      context,
                      getScopedContentKey(sectionEntryKey, "cards"),
                      getObjectList(context, "home.stats.cards", [
                        {
                          value: "12:1",
                          label: "Typical student-teacher ratio",
                        },
                        {
                          value: "24+",
                          label: "Clubs and enrichment activities",
                        },
                        {
                          value: "100%",
                          label: "Focus on student wellbeing",
                        },
                      ])
                    )
                  ).map((item, index) => (
                    <article
                      key={`${sectionEntryKey}-${item.label ?? "stat"}-${index}`}
                      style={{
                        position: "relative",
                        borderRadius: 24,
                        background: "rgba(255,255,255,0.84)",
                        border: "1px solid rgba(15, 76, 129, 0.12)",
                        padding: 20,
                      }}
                    >
                      <RepeatableItemActions
                        mode={context.mode}
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        itemIndex={index}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="value"
                        fallback={item.value || ""}
                        mode={context.mode}
                        style={{
                          margin: 0,
                          color: context.config.themeConfig.primaryColor,
                          fontSize: 28,
                          fontWeight: 800,
                        }}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="label"
                        fallback={item.label || ""}
                        mode={context.mode}
                        style={{
                          margin: "8px 0 0",
                          color: "#475569",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      />
                    </article>
                  ))}
                </div>
                <RepeatableAddButton
                  mode={context.mode}
                  objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                  preset="stat-cards"
                  label="Stat Card"
                />
              </SectionFrame>
            );
          }

          if (
            baseSectionKey === "home.staff" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            const staffCards = getObjectList(
              context,
              getScopedContentKey(sectionEntryKey, "cards"),
              getObjectList(context, "home.staff.cards", [
                {
                  name: "Mrs. Amina Yusuf",
                  role: "Head of School",
                  bio: "Leads the school with a commitment to academic excellence, student care, and a strong partnership with families.",
                  imageUrl:
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
                },
                {
                  name: "Mr. Daniel Okafor",
                  role: "Admissions Lead",
                  bio: "Helps families understand the school journey, prepare application documents, and plan a confident visit.",
                  imageUrl:
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
                },
              ])
            );

            return (
              <SectionFrame
                key={sectionEntryKey}
                mode={context.mode}
                sectionKey={sectionEntryKey}
                pageKey="home"
                label="Staff Spotlight"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 18,
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    marginBottom: 24,
                  }}
                >
                  {staffCards.map((item, index) => (
                    <article
                      key={`${sectionEntryKey}-${item.name ?? "staff"}-${index}`}
                      style={{
                        position: "relative",
                        borderRadius: 24,
                        background: "#ffffff",
                        border: "1px solid rgba(15, 76, 129, 0.12)",
                        overflow: "hidden",
                      }}
                    >
                      <RepeatableItemActions
                        mode={context.mode}
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        itemIndex={index}
                      />
                      <EditableMedia
                        alt={item.name || "Staff member"}
                        fallback={item.imageUrl || ""}
                        mode={context.mode}
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="imageUrl"
                        style={{
                          display: "block",
                          width: "100%",
                          height: 220,
                          objectFit: "cover",
                          borderRadius: 0,
                        }}
                      />
                      <div style={{ padding: 18 }}>
                        <EditableText
                          as="p"
                          objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                          objectListIndex={index}
                          objectListItemKey="name"
                          fallback={item.name || ""}
                          mode={context.mode}
                          style={{ margin: 0, fontSize: 18, fontWeight: 700 }}
                        />
                        <EditableText
                          as="p"
                          objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                          objectListIndex={index}
                          objectListItemKey="role"
                          fallback={item.role || ""}
                          mode={context.mode}
                          style={{ margin: "6px 0 0", color: "#0f4c81", fontWeight: 600 }}
                        />
                        <EditableText
                          as="p"
                          objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                          objectListIndex={index}
                          objectListItemKey="bio"
                          fallback={item.bio || ""}
                          mode={context.mode}
                          style={{
                            margin: "10px 0 0",
                            color: "#64748b",
                            lineHeight: 1.7,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
                <RepeatableAddButton
                  mode={context.mode}
                  objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                  preset="staff-cards"
                  label="Staff Card"
                />
              </SectionFrame>
            );
          }

          if (
            baseSectionKey === "home.admissions" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            return (
              <SectionFrame
                key={sectionEntryKey}
                mode={context.mode}
                sectionKey={sectionEntryKey}
                pageKey="home"
                label="Admission Links"
              >
                <AdmissionLinksSection context={context} />
              </SectionFrame>
            );
          }

          if (
            baseSectionKey === "home.announcements" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            const announcements = getObjectList(
              context,
              getScopedContentKey(sectionEntryKey, "cards"),
              getObjectList(
                context,
                "home.announcements.cards",
                collectionToAnnouncementCards(
                  getCollectionItems(context, "announcements")
                )
              )
            );

            return (
              <SectionFrame
                key={sectionEntryKey}
                mode={context.mode}
                sectionKey={sectionEntryKey}
                pageKey="home"
                label="Announcements"
              >
                <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                  {announcements.map((item, index) => (
                    <article
                      key={`${sectionEntryKey}-${item.title ?? "announcement"}-${index}`}
                      style={{
                        position: "relative",
                        borderRadius: 24,
                        background: "#ffffff",
                        border: "1px solid rgba(15, 76, 129, 0.12)",
                        padding: 20,
                      }}
                    >
                      <RepeatableItemActions
                        mode={context.mode}
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        itemIndex={index}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="date"
                        fallback={item.date || ""}
                        mode={context.mode}
                        style={{ margin: 0, color: "#0f4c81", fontSize: 12, fontWeight: 700 }}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="title"
                        fallback={item.title || ""}
                        mode={context.mode}
                        style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700 }}
                      />
                      <EditableText
                        as="p"
                        objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                        objectListIndex={index}
                        objectListItemKey="description"
                        fallback={item.description || ""}
                        mode={context.mode}
                        style={{
                          margin: "10px 0 0",
                          color: "#64748b",
                          lineHeight: 1.7,
                        }}
                      />
                    </article>
                  ))}
                </div>
                <RepeatableAddButton
                  mode={context.mode}
                  objectListKey={getScopedContentKey(sectionEntryKey, "cards")}
                  preset="announcement-cards"
                  label="Announcement"
                />
              </SectionFrame>
            );
          }

          return null;
        })}
      </PageShell>
    </SectionFrame>
  );
}

function AboutPage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "about.story", true)) {
    return null;
  }
  return (
    <SectionFrame mode={context.mode} sectionKey="about.story" label="Story Section">
      <PageShell
        context={context}
        eyebrow="About the School"
        title={getCopy(
          context,
          "about.story.title",
          `A caring school community for every learner`
        )}
        body={getCopy(
          context,
          "about.story.body",
          `${context.tenant.schoolName} partners with families to nurture confident learners, thoughtful character, and the habits students need for the next stage of school and life.`
        )}
      />
    </SectionFrame>
  );
}

function AdmissionsPage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "admissions.process", true)) {
    return null;
  }
  return (
    <SectionFrame mode={context.mode} sectionKey="admissions.process" label="Process Section">
      <PageShell
        context={context}
        eyebrow="Admissions"
        title={getCopy(
          context,
          "admissions.process.title",
          "A clear admissions path for your family"
        )}
        body={getCopy(
          context,
          "admissions.process.body",
          "Book a visit, speak with the admissions team, review entry requirements, and submit the documents needed for the right class placement."
        )}
      >
        {isSectionVisible(context, "admissions.openLinks", true) ? (
          <SectionFrame
            mode={context.mode}
            sectionKey="admissions.openLinks"
            pageKey="admissions"
            label="Open Admission Links"
          >
            <AdmissionLinksSection
              context={context}
              eyebrow="Open applications"
              title="Choose the right admission path"
              body="Start with the class your child is applying for, then complete the school admission form and uploads online."
            />
          </SectionFrame>
        ) : null}
      </PageShell>
    </SectionFrame>
  );
}

function BlogListPage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "blog-list.intro", true)) {
    return null;
  }
  return (
    <SectionFrame mode={context.mode} sectionKey="blog-list.intro" label="Blog Intro">
      <PageShell
        context={context}
        eyebrow="Blog and News"
        title={getCopy(
          context,
          "blog-list.intro.title",
          "Stories and updates from school life"
        )}
        body={getCopy(
          context,
          "blog-list.intro.body",
          "Read campus news, classroom highlights, student achievements, family notices, and reflections from across the school community."
        )}
      >
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {getCollectionItems(context, "blogPosts").map((post) => (
            <article
              key={post.id}
              style={{
                borderRadius: 24,
                border: "1px solid rgba(15, 76, 129, 0.12)",
                background: "#ffffff",
                overflow: "hidden",
              }}
            >
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  style={{ display: "block", width: "100%", height: 180, objectFit: "cover" }}
                />
              ) : null}
              <div style={{ padding: 18 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{post.category}</p>
                <h3 style={{ margin: "8px 0 0", fontSize: 18 }}>{post.title}</h3>
                <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7 }}>
                  {post.excerpt}
                </p>
              </div>
            </article>
          ))}
        </div>
      </PageShell>
    </SectionFrame>
  );
}

function BlogPostPage(context: WebsiteTemplateRenderContext) {
  const post = getCollectionItem(
    getCollectionItems(context, "blogPosts"),
    context.routeSlug
  );

  if (!post) return null;

  return (
    <PageShell
      context={context}
      eyebrow={post.category ?? "Blog"}
      title={post.title}
      body={post.excerpt}
      imageUrl={post.imageUrl}
    >
      <article
        style={{
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(15, 76, 129, 0.12)",
          padding: 24,
          lineHeight: 1.8,
        }}
      >
        {post.body}
      </article>
    </PageShell>
  );
}

function EventListPage(context: WebsiteTemplateRenderContext) {
  return (
    <PageShell
      context={context}
      eyebrow="Events"
      title="Upcoming events and school activities"
      body="Find open days, parent meetings, academic showcases, orientation programs, and community moments worth adding to the family calendar."
    >
      <div style={{ display: "grid", gap: 16 }}>
        {getCollectionItems(context, "events").map((event) => (
          <article
            key={event.id}
            style={{
              borderRadius: 24,
              background: "#ffffff",
              border: "1px solid rgba(15, 76, 129, 0.12)",
              padding: 20,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{event.publishedAt}</p>
            <h3 style={{ margin: "8px 0 0", fontSize: 18 }}>{event.title}</h3>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7 }}>
              {event.excerpt}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function EventPostPage(context: WebsiteTemplateRenderContext) {
  const event = getCollectionItem(
    getCollectionItems(context, "events"),
    context.routeSlug
  );

  if (!event) return null;

  return (
    <PageShell
      context={context}
      eyebrow={event.category ?? "Event"}
      title={event.title}
      body={event.excerpt}
      imageUrl={event.imageUrl}
    >
      <article
        style={{
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(15, 76, 129, 0.12)",
          padding: 24,
          lineHeight: 1.8,
        }}
      >
        {event.body}
      </article>
    </PageShell>
  );
}

function ResourceListPage(context: WebsiteTemplateRenderContext) {
  return (
    <PageShell
      context={context}
      eyebrow="Resources"
      title="Helpful resources for families"
      body="Access admissions guidance, school calendars, family handbooks, forms, and documents that help parents stay prepared."
    >
      <div style={{ display: "grid", gap: 16 }}>
        {getCollectionItems(context, "resources").map((resource) => (
          <article
            key={resource.id}
            style={{
              borderRadius: 24,
              background: "#ffffff",
              border: "1px solid rgba(15, 76, 129, 0.12)",
              padding: 20,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{resource.category}</p>
            <h3 style={{ margin: "8px 0 0", fontSize: 18 }}>{resource.title}</h3>
            <p style={{ margin: "10px 0 0", color: "#475569", lineHeight: 1.7 }}>
              {resource.excerpt}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function ResourcePostPage(context: WebsiteTemplateRenderContext) {
  const resource = getCollectionItem(
    getCollectionItems(context, "resources"),
    context.routeSlug
  );

  if (!resource) return null;

  return (
    <PageShell
      context={context}
      eyebrow={resource.category ?? "Resource"}
      title={resource.title}
      body={resource.excerpt}
    >
      <article
        style={{
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(15, 76, 129, 0.12)",
          padding: 24,
          lineHeight: 1.8,
        }}
      >
        {resource.body}
      </article>
    </PageShell>
  );
}

function ContactPage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "contact.info", true)) {
    return null;
  }
  return (
    <SectionFrame mode={context.mode} sectionKey="contact.info" label="Contact Section">
      <PageShell
        context={context}
        eyebrow="Contact"
        title={getCopy(
          context,
          "contact.info.title",
          "Speak with the school team"
        )}
        body={getCopy(
          context,
          "contact.info.body",
          "Contact the school office for tours, admissions guidance, class placement questions, office hours, and directions to campus."
        )}
      />
    </SectionFrame>
  );
}

const inlineCanvasButtonStyle = {
  borderRadius: 999,
  border: "1px solid rgba(15, 76, 129, 0.16)",
  background: "#ffffff",
  color: "#0f4c81",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  padding: "8px 10px",
} satisfies CSSProperties;

export const k12PlusTemplate1: WebsiteTemplateDefinition = defineWebsiteTemplate({
  manifest: {
    id: "k12-plus-template-1",
    name: "Scholaris",
    institutionTypes: ["K12", "PRIMARY", "SECONDARY"],
    supportedPlans: ["PLUS", "PRO", "ENTERPRISE"],
    description: "Academic-forward starter template for multi-page public school sites.",
    thumbnail: "/templates/k12-plus-template-1/thumbnail.svg",
    previewImages: ["/templates/k12-plus-template-1/thumbnail.svg"],
    tags: ["academic", "premium", "modern"],
    features: ["multi-page", "admissions", "blog", "contact"],
    pages: [
      {
        key: "home",
        label: "Home",
        route: "/",
        sections: [
          {
            key: "home.hero",
            label: "Hero",
            defaultVisible: true,
            required: true,
            editables: [
              {
                key: "home.hero.kicker",
                label: "Hero kicker",
                description: "Short trust-building eyebrow above the headline.",
                aiDescription:
                  "Write a short school-facing eyebrow for families visiting the school's public website.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.hero.title",
                label: "Hero title",
                description: "Main homepage headline introducing the school.",
                aiDescription:
                  "Write a warm homepage headline for a real school speaking to prospective parents.",
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "home.hero.body",
                label: "Hero body",
                description: "Supporting hero copy for homepage.",
                aiDescription:
                  "Write clear school homepage copy about academics, care, campus life, and admissions confidence.",
                contentType: "long-text",
                sizeGuidance: "20-60 words",
              },
              {
                key: "home.hero.cta",
                label: "Hero CTA",
                description: "Primary call-to-action label for the homepage hero.",
                aiDescription:
                  "Write a parent-facing admissions or visit call-to-action label.",
                contentType: "cta",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.hero.highlights",
                label: "Hero highlights",
                description: "Short supporting highlight list for the hero area, one item per line.",
                aiDescription:
                  "Write three short school strengths families can understand quickly.",
                contentType: "list",
                sizeGuidance: "3 short lines",
              },
              {
                key: "home.hero.imageUrl",
                label: "Hero image URL",
                description: "Public image URL for the hero media panel.",
                contentType: "media-asset",
                sizeGuidance: "single image URL",
              },
              createTestimonialBlockField({
                key: "home.hero.testimonials",
                description: "Repeatable testimonial cards shown under the hero.",
              }),
              createGalleryBlockField({
                key: "home.hero.gallery",
                description: "Repeatable image cards under the hero section.",
              }),
            ],
          },
          {
            key: "home.features",
            label: "Feature cards",
            defaultVisible: true,
            editables: [
              createFeatureCardBlockField({
                key: "home.features.cards",
                description:
                  "Homepage feature cards that explain the school experience, academics, care, and admissions journey.",
              }),
            ],
          },
          {
            key: "home.stats",
            label: "Stats",
            defaultVisible: true,
            editables: [
              createStatCardBlockField({
                key: "home.stats.cards",
                description:
                  "Short trust-building number cards for the homepage.",
              }),
            ],
          },
          {
            key: "home.staff",
            label: "Staff spotlight",
            defaultVisible: true,
            editables: [
              createStaffCardBlockField({
                key: "home.staff.cards",
                description: "Public staff spotlight cards for the homepage.",
              }),
            ],
          },
          {
            key: "home.admissions",
            label: "Admission links",
            defaultVisible: true,
            editables: [],
          },
          {
            key: "home.announcements",
            label: "Announcements",
            defaultVisible: true,
            editables: [
              createAnnouncementCardBlockField({
                key: "home.announcements.cards",
                description: "Recent public updates and headline announcements.",
              }),
            ],
          },
        ],
      },
      {
        key: "about",
        label: "About",
        route: "/about",
        sections: [
          {
            key: "about.story",
            label: "School story",
            defaultVisible: true,
            editables: [
              {
                key: "about.story.title",
                label: "About title",
                description: "Primary heading for the about page.",
                aiDescription:
                  "Write an about-page heading for a school describing its mission and community.",
                contentType: "short-text",
                sizeGuidance: "4-9 words",
              },
              {
                key: "about.story.body",
                label: "About body",
                description: "School story and positioning on the about page.",
                aiDescription:
                  "Write an about-page paragraph for a school covering mission, learning culture, and family trust.",
                contentType: "long-text",
                sizeGuidance: "30-80 words",
              },
            ],
          },
        ],
      },
      {
        key: "admissions",
        label: "Admissions",
        route: "/admissions",
        sections: [
          {
            key: "admissions.process",
            label: "Admissions process",
            defaultVisible: true,
            editables: [
              {
                key: "admissions.process.title",
                label: "Admissions title",
                description: "Primary admissions page heading.",
                aiDescription:
                  "Write a clear admissions heading that helps families feel guided and welcome.",
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "admissions.process.body",
                label: "Admissions body",
                description: "Admissions explanation and next steps.",
                aiDescription:
                  "Write admissions copy explaining visits, documents, placement, and next steps for parents.",
                contentType: "long-text",
                sizeGuidance: "30-90 words",
              },
            ],
          },
          {
            key: "admissions.openLinks",
            label: "Open admission links",
            defaultVisible: true,
            editables: [],
          },
        ],
      },
      {
        key: "blog-list",
        label: "Blog",
        route: "/blog",
        sections: [
          {
            key: "blog-list.intro",
            label: "Blog intro",
            defaultVisible: true,
            editables: [
              {
                key: "blog-list.intro.title",
                label: "Blog intro title",
                description: "Heading for the blog listing page.",
                aiDescription:
                  "Write a school news/blog heading for campus stories and family updates.",
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "blog-list.intro.body",
                label: "Blog intro body",
                description: "Supporting introduction for the blog list page.",
                aiDescription:
                  "Write a short intro for school news, classroom highlights, events, and community stories.",
                contentType: "long-text",
                sizeGuidance: "20-60 words",
              },
            ],
          },
        ],
      },
      {
        key: "blog-post",
        label: "Blog Post",
        route: "/blog/[slug]",
        sections: [],
      },
      {
        key: "event-list",
        label: "Events",
        route: "/events",
        sections: [],
      },
      {
        key: "event-post",
        label: "Event Detail",
        route: "/events/[slug]",
        sections: [],
      },
      {
        key: "resource-list",
        label: "Resources",
        route: "/resources",
        sections: [],
      },
      {
        key: "resource-post",
        label: "Resource Detail",
        route: "/resources/[slug]",
        sections: [],
      },
      {
        key: "contact",
        label: "Contact",
        route: "/contact",
        sections: [
          {
            key: "contact.info",
            label: "Contact information",
            defaultVisible: true,
            editables: [
              {
                key: "contact.info.title",
                label: "Contact title",
                description: "Main contact page heading.",
                aiDescription:
                  "Write a contact-page heading inviting families to reach the school.",
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "contact.info.body",
                label: "Contact body",
                description: "Supporting text for the contact page.",
                aiDescription:
                  "Write contact copy about tours, admissions questions, school office support, and campus directions.",
                contentType: "long-text",
                sizeGuidance: "20-60 words",
              },
            ],
          },
        ],
      },
    ],
    themeSchema: {
      colorSlots: ["primary", "secondary", "accent", "surface"],
      headingFontOptions: ["Georgia", "Merriweather", "Cal Sans"],
      bodyFontOptions: ["Inter", "Source Sans 3", "Lato"],
      radiusOptions: ["none", "sm", "md", "lg", "full"],
      densityOptions: ["compact", "comfortable", "airy"],
      stylePresets: ["classic-academic", "bright-campus"],
    },
    defaultThemeConfig: {
      primaryColor: "#0f4c81",
      secondaryColor: "#e8f1f7",
      accentColor: "#f59e0b",
      surfaceColor: "#ffffff",
      headingFont: "Georgia",
      bodyFont: "Inter",
      radius: "lg",
      density: "comfortable",
      stylePreset: "classic-academic",
    },
    dataRequirements: [
      "school-profile",
      "announcements",
      "blog",
      "admission-links",
      "events",
      "resources",
      "contact-info",
    ],
  },
  renderers: {
    home: HomePage,
    about: AboutPage,
    admissions: AdmissionsPage,
    "blog-list": BlogListPage,
    "blog-post": BlogPostPage,
    "event-list": EventListPage,
    "event-post": EventPostPage,
    "resource-list": ResourceListPage,
    "resource-post": ResourcePostPage,
    contact: ContactPage,
  },
});
