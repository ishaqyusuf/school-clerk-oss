import type {
  WebsiteAdmissionLink,
  WebsiteRegistryFeatureDefinition,
  WebsiteTemplateRenderContext,
} from "../../types";

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function classSummary(link: WebsiteAdmissionLink) {
  if (link.classroomLabels.length) {
    const visibleClassrooms = link.classroomLabels.slice(0, 3);
    const visibleLabels = visibleClassrooms.join(", ");
    const remainingCount = link.classroomCount - visibleClassrooms.length;

    return remainingCount > 0
      ? `${visibleLabels} + ${remainingCount} more`
      : visibleLabels;
  }

  return `${link.classroomCount} class${link.classroomCount === 1 ? "" : "es"}`;
}

export function AdmissionLinksSection({
  context,
  eyebrow = "Admissions",
  title = "Admission applications are open",
  body = "Select an open admission link, review the class requirements, and submit the parent application online.",
}: {
  context: WebsiteTemplateRenderContext;
  eyebrow?: string;
  title?: string;
  body?: string;
}) {
  const links = context.contentData?.admissionLinks ?? [];
  const theme = context.config.themeConfig;

  if (!links.length) return null;

  return (
    <section
      style={{
        margin: "0 auto",
        maxWidth: 1120,
        padding: "18px 0 28px",
      }}
    >
      <div
        style={{
          alignItems: "end",
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        }}
      >
        <div>
          <p
            style={{
              color: theme.primaryColor,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0,
              margin: "0 0 10px",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              color: "#0f172a",
              fontFamily: theme.headingFont,
              fontSize: 38,
              lineHeight: 1,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: "rgba(15, 23, 42, 0.7)",
              fontSize: 16,
              lineHeight: 1.7,
              margin: "16px 0 0",
              maxWidth: 620,
            }}
          >
            {body}
          </p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {links.map((link) => {
            const closesAt = formatDate(link.closesAt);

            return (
              <article
                key={link.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15, 23, 42, 0.1)",
                  borderRadius: 8,
                  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    alignItems: "start",
                    display: "flex",
                    gap: 14,
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        color: "#0f172a",
                        fontFamily: theme.headingFont,
                        fontSize: 22,
                        lineHeight: 1.15,
                        margin: 0,
                      }}
                    >
                      {link.title}
                    </h3>
                    <p
                      style={{
                        color: "rgba(15, 23, 42, 0.68)",
                        lineHeight: 1.6,
                        margin: "10px 0 0",
                      }}
                    >
                      {link.instructions || classSummary(link)}
                    </p>
                  </div>
                  <span
                    style={{
                      background: `${theme.primaryColor}12`,
                      borderRadius: 999,
                      color: theme.primaryColor,
                      flex: "0 0 auto",
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "7px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {link.classroomCount} open
                  </span>
                </div>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "space-between",
                    marginTop: 18,
                  }}
                >
                  <p
                    style={{
                      color: "rgba(15, 23, 42, 0.56)",
                      fontSize: 13,
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {closesAt ? `Closes ${closesAt}` : classSummary(link)}
                  </p>
                  <a
                    href={link.href}
                    style={{
                      background: theme.primaryColor,
                      borderRadius: 999,
                      color: "#ffffff",
                      display: "inline-flex",
                      fontSize: 14,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      minHeight: 42,
                      padding: "11px 16px",
                      textDecoration: "none",
                    }}
                  >
                    Apply now
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const admissionsFeature: WebsiteRegistryFeatureDefinition = {
  key: "admissions",
  label: "Admissions",
  description:
    "Show open admission links from the school admission setup on the public website.",
  dataRequirements: ["admission-links"],
  sections: [
    {
      key: "home.admissions",
      label: "Admission links",
      featureKey: "admissions",
      supportedPages: ["home", "admissions"],
      defaultVisible: true,
      modes: ["production", "preview", "editor", "dummy"],
      editables: [],
    },
  ],
};
