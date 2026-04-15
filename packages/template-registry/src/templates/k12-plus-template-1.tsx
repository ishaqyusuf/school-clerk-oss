import type { CSSProperties, ReactNode } from "react";
import { EditableMedia } from "../components/editable-media";
import { EditableText } from "../components/editable-text";
import { SectionFrame } from "../components/section-frame";
import { useWebsiteEditor } from "../editor-context";
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
  collection: keyof NonNullable<WebsiteTemplateRenderContext["contentData"]>
) {
  return context.contentData?.[collection] ?? [];
}

function getCollectionItem(
  items: WebsiteCollectionItem[],
  slug: string | null | undefined
) {
  return items.find((item) => item.slug === slug) ?? items[0];
}

function getEmptyBlockItem(
  preset:
    | "testimonials"
    | "gallery"
    | "feature-cards"
    | "stat-cards"
    | "staff-cards"
    | "announcement-cards"
) {
  switch (preset) {
    case "testimonials":
      return { quote: "", name: "", role: "" } as Record<string, string>;
    case "gallery":
      return { title: "", description: "", imageUrl: "" } as Record<string, string>;
    case "feature-cards":
      return { title: "", description: "" } as Record<string, string>;
    case "stat-cards":
      return { value: "", label: "" } as Record<string, string>;
    case "staff-cards":
      return { name: "", role: "", bio: "", imageUrl: "" } as Record<string, string>;
    case "announcement-cards":
      return { date: "", title: "", description: "" } as Record<string, string>;
  }
}

function RepeatableItemActions({
  mode,
  objectListKey,
  itemIndex,
}: {
  mode: WebsiteTemplateRenderContext["mode"];
  objectListKey: string;
  itemIndex: number;
}) {
  const editor = useWebsiteEditor();

  if (mode !== "editor" || !editor) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1,
      }}
    >
      <button
        type="button"
        onClick={() => editor.removeObjectListItem(objectListKey, itemIndex)}
        style={inlineCanvasButtonStyle}
      >
        Remove
      </button>
    </div>
  );
}

function RepeatableAddButton({
  mode,
  objectListKey,
  preset,
  label,
}: {
  mode: WebsiteTemplateRenderContext["mode"];
  objectListKey: string;
  preset:
    | "testimonials"
    | "gallery"
    | "feature-cards"
    | "stat-cards"
    | "staff-cards"
    | "announcement-cards";
  label: string;
}) {
  const editor = useWebsiteEditor();

  if (mode !== "editor" || !editor) return null;

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16 }}>
      <button
        type="button"
        onClick={() => editor.addObjectListItem(objectListKey, getEmptyBlockItem(preset))}
        style={inlineCanvasButtonStyle}
      >
        Add {label}
      </button>
    </div>
  );
}

function PageShell({
  context,
  eyebrow,
  title,
  body,
  cta,
  imageUrl,
  highlights,
  testimonials,
  gallery,
  children,
}: {
  context: WebsiteTemplateRenderContext;
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
  imageUrl?: string;
  highlights?: string[];
  testimonials?: Array<Record<string, string>>;
  gallery?: Array<Record<string, string>>;
  children?: ReactNode;
}) {
  const theme = context.config.themeConfig;
  const editor = useWebsiteEditor();
  const safeTestimonials = testimonials ?? [];
  const safeGallery = gallery ?? [];

  return (
    <main
      style={{
        background: `linear-gradient(180deg, ${theme.secondaryColor} 0%, #ffffff 35%, #f8fafc 100%)`,
        color: "#0f172a",
        minHeight: "100vh",
        fontFamily: theme.bodyFont,
      }}
    >
      <section
        style={{
          margin: "0 auto",
          maxWidth: 1120,
          padding: "72px 24px 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 28,
            alignItems: "center",
            gridTemplateColumns: imageUrl ? "minmax(0, 1.1fr) minmax(320px, 0.9fr)" : "1fr",
          }}
        >
          <div>
            <EditableText
              as="div"
              fieldKey={`${context.pageKey}.hero.kicker`}
              fallback={eyebrow}
              mode={context.mode}
              style={{
                display: "inline-flex",
                borderRadius: 999,
                background: "rgba(255,255,255,0.7)",
                border: `1px solid ${theme.primaryColor}22`,
                color: theme.primaryColor,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "8px 12px",
                textTransform: "uppercase",
              }}
            />
            <EditableText
              as="h1"
              fieldKey={`${context.pageKey}.hero.title`}
              fallback={title}
              mode={context.mode}
              style={{
                fontFamily: theme.headingFont,
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                lineHeight: 1.02,
                margin: "20px 0 16px",
                maxWidth: 760,
              }}
            />
            <EditableText
              as="p"
              fieldKey={`${context.pageKey}.hero.body`}
              fallback={body}
              mode={context.mode}
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                margin: 0,
                maxWidth: 760,
              }}
            />
            {cta ? (
              <div style={{ marginTop: 24 }}>
                <button
                  type="button"
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: theme.primaryColor,
                    color: "#ffffff",
                    padding: "14px 20px",
                    fontWeight: 700,
                    cursor: context.mode === "editor" ? "default" : "pointer",
                  }}
                >
                  <EditableText
                    as="span"
                    fieldKey={`${context.pageKey}.hero.cta`}
                    fallback={cta}
                    mode={context.mode}
                    style={{ color: "inherit" }}
                  />
                </button>
              </div>
            ) : null}
            {highlights?.length ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                {highlights.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${theme.primaryColor}22`,
                      background: "#ffffff",
                      padding: "10px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
            {safeTestimonials.length || context.mode === "editor" ? (
              <div>
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    marginTop: 24,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  {safeTestimonials.map((item, index) => (
                    <article
                      key={`${item.name ?? "testimonial"}-${index}`}
                      style={{
                        position: "relative",
                        background: "rgba(255,255,255,0.82)",
                        border: "1px solid rgba(15, 76, 129, 0.12)",
                        borderRadius: 24,
                        padding: 18,
                      }}
                    >
                      <RepeatableItemActions
                        mode={context.mode}
                        objectListKey="home.hero.testimonials"
                        itemIndex={index}
                      />
                      <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                        "{item.quote}"
                      </p>
                      <p style={{ margin: "14px 0 0", fontWeight: 700 }}>
                        {item.name}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                        {item.role}
                      </p>
                    </article>
                  ))}
                </div>
                <RepeatableAddButton
                  mode={context.mode}
                  objectListKey="home.hero.testimonials"
                  preset="testimonials"
                  label="Testimonial"
                />
              </div>
            ) : null}
          </div>
          {imageUrl ? (
            <div
              style={{
                minHeight: 340,
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(15, 76, 129, 0.12)",
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
                background: "#dbeafe",
              }}
            >
              <EditableMedia
                alt={`${context.tenant.schoolName} campus preview`}
                fieldKey={`${context.pageKey}.hero.imageUrl`}
                fallback={imageUrl}
                mode={context.mode}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  minHeight: 340,
                  objectFit: "cover",
                }}
              />
            </div>
          ) : null}
        </div>
        {safeGallery.length || context.mode === "editor" ? (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: 28,
            }}
          >
            {safeGallery.map((item, index) => (
              <article
                key={`${item.title ?? "gallery"}-${index}`}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 24,
                  border: "1px solid rgba(15, 76, 129, 0.12)",
                  background: "#ffffff",
                }}
              >
                <RepeatableItemActions
                  mode={context.mode}
                  objectListKey="home.hero.gallery"
                  itemIndex={index}
                />
                <EditableMedia
                  alt={item.title || `Gallery item ${index + 1}`}
                  fallback={item.imageUrl || ""}
                  mode={context.mode}
                  objectListKey="home.hero.gallery"
                  objectListIndex={index}
                  objectListItemKey="imageUrl"
                  style={{
                    display: "block",
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    background: "#dbeafe",
                    borderRadius: 0,
                  }}
                />
                <div style={{ padding: 16 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#64748b",
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <RepeatableAddButton
                mode={context.mode}
                objectListKey="home.hero.gallery"
                preset="gallery"
                label="Gallery Item"
              />
            </div>
          </div>
        ) : null}
      </section>
      <section
        style={{
          margin: "0 auto",
          maxWidth: 1120,
          padding: "24px",
        }}
      >
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            ["/", "Home"],
            ["/about", "About"],
            ["/admissions", "Admissions"],
            ["/blog", "Blog"],
            ["/contact", "Contact"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={context.mode === "editor" ? "#" : href}
              onClick={(event) => {
                if (context.mode === "editor") event.preventDefault();
              }}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.primaryColor}22`,
                color: theme.primaryColor,
                padding: "10px 14px",
                textDecoration: "none",
                background: "#ffffff",
                fontWeight: 600,
                opacity: context.mode === "editor" ? 0.7 : 1,
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        {context.mode === "editor" && editor ? (
          <p
            style={{
              margin: "0 0 20px",
              color: "#475569",
              fontSize: 13,
            }}
          >
            Inline editing is active. Click highlighted text blocks to edit them
            directly in the preview.
          </p>
        ) : null}
        {children}
      </section>
    </main>
  );
}

function HomePage(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "home.hero", true)) {
    return null;
  }

  const orderedHomeSections = getPageSectionOrder(context, "home", [
    "home.features",
    "home.stats",
    "home.staff",
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
          "Build a public school website that actually converts interest into enrollment."
        )}
        body={getCopy(
          context,
          "home.hero.body",
          "This starter template registry scaffold proves the public runtime can render from manifest and configuration instead of hardcoded pages."
        )}
        cta={getCopy(context, "home.hero.cta", "Start Admission Enquiry")}
        imageUrl={getCopy(
          context,
          "home.hero.imageUrl",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80"
        )}
        highlights={getList(context, "home.hero.highlights", [
          "Multi-page templates",
          "Admissions ready",
          "Parent-friendly messaging",
        ])}
        testimonials={getObjectList(context, "home.hero.testimonials", [
          {
            quote:
              "The website made our admissions process feel clearer and more reassuring from the first visit.",
            name: "Parent Community",
            role: "Prospective Family Feedback",
          },
          {
            quote:
              "We finally have a public site that feels polished enough for our school brand.",
            name: "School Leadership",
            role: "Administrative Team",
          },
        ])}
        gallery={getObjectList(context, "home.hero.gallery", [
          {
            title: "Campus Welcome",
            description: "Show families the atmosphere they can expect on visit day.",
            imageUrl:
              "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
          },
          {
            title: "Learning Spaces",
            description: "Use visual proof to support your academic positioning.",
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
                      getObjectList(context, "home.features.cards", [])
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
                      getObjectList(context, "home.stats.cards", [])
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
              getObjectList(context, "home.staff.cards", [])
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
            baseSectionKey === "home.announcements" &&
            isSectionVisible(context, sectionEntryKey, true)
          ) {
            const announcements = getObjectList(
              context,
              getScopedContentKey(sectionEntryKey, "cards"),
              getObjectList(context, "home.announcements.cards", [])
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
        title={getCopy(context, "about.story.title", "A clear story builds trust")}
        body={getCopy(
          context,
          "about.story.body",
          "Use this page to introduce the school mission, learning philosophy, and reasons families should believe in the experience."
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
          "Admissions should feel simple before they feel formal"
        )}
        body={getCopy(
          context,
          "admissions.process.body",
          "Highlight timelines, entry points, required documents, and the parent journey from enquiry to confirmed enrollment."
        )}
      />
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
          "Stories that keep the school community close"
        )}
        body={getCopy(
          context,
          "blog-list.intro.body",
          "This scaffold uses a page placeholder today, and the production platform will later hydrate it from tenant-owned news and blog resources."
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
      title="Campus moments worth showing up for"
      body="Promote open days, school fairs, orientation programs, and academic showcases with clear next steps."
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
      title="Helpful resources for prospective families"
      body="Organize forms, guides, and admissions downloads in one place."
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
          "Open the conversation with prospective families"
        )}
        body={getCopy(
          context,
          "contact.info.body",
          "Share phone numbers, office hours, location, social links, and admissions contact details in a calm and confident layout."
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
    thumbnail: "/templates/k12-plus-template-1/thumbnail.png",
    previewImages: [],
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
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.hero.title",
                label: "Hero title",
                description: "Main homepage headline introducing the school.",
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "home.hero.body",
                label: "Hero body",
                description: "Supporting hero copy for homepage.",
                contentType: "long-text",
                sizeGuidance: "20-60 words",
              },
              {
                key: "home.hero.cta",
                label: "Hero CTA",
                description: "Primary call-to-action label for the homepage hero.",
                contentType: "cta",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.hero.highlights",
                label: "Hero highlights",
                description: "Short supporting highlight list for the hero area, one item per line.",
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
                  "Homepage feature cards that explain the value of the school or the website experience.",
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
                contentType: "short-text",
                sizeGuidance: "4-9 words",
              },
              {
                key: "about.story.body",
                label: "About body",
                description: "School story and positioning on the about page.",
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
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "admissions.process.body",
                label: "Admissions body",
                description: "Admissions explanation and next steps.",
                contentType: "long-text",
                sizeGuidance: "30-90 words",
              },
            ],
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
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "blog-list.intro.body",
                label: "Blog intro body",
                description: "Supporting introduction for the blog list page.",
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
                contentType: "short-text",
                sizeGuidance: "4-10 words",
              },
              {
                key: "contact.info.body",
                label: "Contact body",
                description: "Supporting text for the contact page.",
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
    dataRequirements: ["school-profile", "blog", "contact-info"],
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
