"use client";

import type { CSSProperties, ReactNode } from "react";
import { EditableMedia } from "../components/editable-media";
import { EditableText } from "../components/editable-text";
import { useWebsiteEditor } from "../editor-context";
import type { WebsiteTemplateRenderContext } from "../types";

type RepeatableBlockPreset =
  | "testimonials"
  | "gallery"
  | "feature-cards"
  | "stat-cards"
  | "staff-cards"
  | "announcement-cards";

function getEmptyBlockItem(preset: RepeatableBlockPreset) {
  switch (preset) {
    case "testimonials":
      return { quote: "", name: "", role: "" } as Record<string, string>;
    case "gallery":
      return {
        title: "",
        description: "",
        imageUrl: "",
      } as Record<string, string>;
    case "feature-cards":
      return { title: "", description: "" } as Record<string, string>;
    case "stat-cards":
      return { value: "", label: "" } as Record<string, string>;
    case "staff-cards":
      return {
        name: "",
        role: "",
        bio: "",
        imageUrl: "",
      } as Record<string, string>;
    case "announcement-cards":
      return {
        date: "",
        title: "",
        description: "",
      } as Record<string, string>;
  }
}

export function RepeatableItemActions({
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

export function RepeatableAddButton({
  mode,
  objectListKey,
  preset,
  label,
}: {
  mode: WebsiteTemplateRenderContext["mode"];
  objectListKey: string;
  preset: RepeatableBlockPreset;
  label: string;
}) {
  const editor = useWebsiteEditor();

  if (mode !== "editor" || !editor) return null;

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16 }}>
      <button
        type="button"
        onClick={() =>
          editor.addObjectListItem(objectListKey, getEmptyBlockItem(preset))
        }
        style={inlineCanvasButtonStyle}
      >
        Add {label}
      </button>
    </div>
  );
}

export function PageShell({
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
            gridTemplateColumns: imageUrl
              ? "minmax(0, 1.1fr) minmax(320px, 0.9fr)"
              : "1fr",
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
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
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
            ["/events", "Events"],
            ["/resources", "Resources"],
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
        {children}
      </section>
    </main>
  );
}

const inlineCanvasButtonStyle = {
  border: "1px solid rgba(15, 76, 129, 0.16)",
  borderRadius: 999,
  background: "#ffffff",
  color: "#0f4c81",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
} satisfies CSSProperties;
