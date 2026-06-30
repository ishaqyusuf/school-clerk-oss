import type {
  WebsiteCollectionItem,
  WebsiteTemplateDefinition,
  WebsiteTemplatePageKey,
  WebsiteTemplateRenderContext,
} from "../types";
import type { CSSProperties } from "react";
import { defineWebsiteTemplate } from "../registry";
import { Button, SiteShell, Text } from "../common";
import { createAnnouncementCardBlockField } from "../block-presets";
import { AdmissionLinksSection } from "../features/admissions/admission-links-section";

function getCopy(
  context: WebsiteTemplateRenderContext,
  key: string,
  fallback: string,
) {
  const value = context.config.content[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function getLoginHref(context: WebsiteTemplateRenderContext) {
  return getCopy(context, "site.login.href", "/login");
}

function isSectionVisible(
  context: WebsiteTemplateRenderContext,
  sectionKey: string,
  defaultVisible = true,
) {
  return context.config.sectionVisibility[sectionKey] ?? defaultVisible;
}

function TemplateNav({ context }: { context: WebsiteTemplateRenderContext }) {
  const theme = context.config.themeConfig;

  return (
    <header
      style={{
        alignItems: "center",
        display: "flex",
        gap: 18,
        justifyContent: "space-between",
        margin: "0 auto",
        maxWidth: 1180,
        padding: "22px 24px",
      }}
    >
      <a
        href="/"
        style={{
          alignItems: "center",
          color: "#16213e",
          display: "inline-flex",
          fontFamily: theme.headingFont,
          fontSize: 18,
          fontWeight: 800,
          gap: 10,
          textDecoration: "none",
        }}
      >
        <span
          style={{
            background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
            borderRadius: 16,
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
            display: "inline-block",
            height: 38,
            width: 38,
          }}
        />
        {context.tenant.schoolName}
      </a>
      <nav
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "flex-end",
        }}
      >
        <a href="/" style={navLinkStyle}>
          Home
        </a>
        <a href="/about" style={navLinkStyle}>
          About
        </a>
        <a href="/admissions" style={navLinkStyle}>
          Admissions
        </a>
        <a href="/blog" style={navLinkStyle}>
          Blog
        </a>
        <a
          href={getLoginHref(context)}
          style={{
            ...navLinkStyle,
            background: "#ffffff",
            border: "1px solid rgba(22, 33, 62, 0.12)",
            borderRadius: 999,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
            padding: "10px 16px",
          }}
        >
          Sign in
        </a>
      </nav>
    </header>
  );
}

function AnnouncementHeader({
  context,
}: {
  context: WebsiteTemplateRenderContext;
}) {
  if (!isSectionVisible(context, "site.announcement-header", true)) {
    return null;
  }

  const theme = context.config.themeConfig;
  const announcement = getAnnouncements(context)[0];

  if (!announcement) return null;

  return (
    <div
      style={{
        background: theme.primaryColor,
        color: "#ffffff",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          margin: "0 auto",
          maxWidth: 1180,
          padding: "10px 24px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            background: "rgba(255,255,255,0.16)",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 900,
            padding: "5px 10px",
            textTransform: "uppercase",
          }}
        >
          {announcement.category || "Announcement"}
        </span>
        <strong style={{ fontSize: 14 }}>{announcement.title}</strong>
        {announcement.ctaLabel ? (
          <a
            href={`/blog/${announcement.slug}`}
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            {announcement.ctaLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TemplateFooter({
  context,
}: {
  context: WebsiteTemplateRenderContext;
}) {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(15, 23, 42, 0.08)",
        color: "rgba(15, 23, 42, 0.68)",
        margin: "0 auto",
        maxWidth: 1180,
        padding: "26px 24px 34px",
      }}
    >
      <p style={{ fontSize: 14, margin: 0 }}>
        {context.tenant.schoolName} prepares curious learners for confident next
        steps.
      </p>
    </footer>
  );
}

function HeroImage({ context }: { context: WebsiteTemplateRenderContext }) {
  const imageUrl = getCopy(
    context,
    "home.hero.imageUrl",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80",
  );

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.24))",
        border: "1px solid rgba(255,255,255,0.72)",
        borderRadius: 34,
        boxShadow: "0 34px 90px rgba(15, 23, 42, 0.18)",
        overflow: "hidden",
        padding: 10,
      }}
    >
      <img
        alt={`${context.tenant.schoolName} students`}
        src={imageUrl}
        style={{
          aspectRatio: "4 / 3",
          borderRadius: 26,
          display: "block",
          objectFit: "cover",
          width: "100%",
        }}
      />
    </div>
  );
}

function getBlogPosts(
  context: WebsiteTemplateRenderContext,
): WebsiteCollectionItem[] {
  const posts = context.contentData?.blogPosts ?? [];

  if (posts.length > 0) {
    return posts;
  }

  return [
    {
      id: "campus-story-1",
      slug: "first-week-of-discovery",
      title: "A first week full of discovery",
      excerpt:
        "From reading corners to science tables, our learners begin each term with colour, confidence, and curiosity.",
      body: `${context.tenant.schoolName} starts every term with simple rhythms that help children feel known: warm greetings, classroom goals, creative projects, and moments for families to see the learning taking shape.`,
      imageUrl:
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
      publishedAt: "2026-01-12",
      category: "Campus Life",
    },
    {
      id: "campus-story-2",
      slug: "building-brave-readers",
      title: "Building brave readers across school",
      excerpt:
        "Our reading programme blends phonics, literature circles, library time, and parent partnership.",
      body: "Reading growth is strongest when learners have the right support at school and at home. Our teachers track progress, celebrate small wins, and keep children surrounded by books they are excited to open.",
      imageUrl:
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
      publishedAt: "2026-02-03",
      category: "Learning",
    },
    {
      id: "campus-story-3",
      slug: "clubs-that-grow-confidence",
      title: "Clubs that grow confidence",
      excerpt:
        "Art, coding, debate, music, and sports give learners room to practise leadership and joy.",
      body: "Beyond classroom lessons, children need safe places to try new skills. Clubs help learners find their voice, collaborate with friends, and discover strengths that shape their wider school story.",
      imageUrl:
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
      publishedAt: "2026-03-18",
      category: "Activities",
    },
  ];
}

function getAnnouncements(
  context: WebsiteTemplateRenderContext,
): WebsiteCollectionItem[] {
  const announcements = context.contentData?.announcements ?? [];

  if (announcements.length > 0) {
    return announcements;
  }

  return getBlogPosts(context).slice(0, 2);
}

function formatDate(value?: string) {
  if (!value) {
    return "School update";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function BlogCard({
  post,
  index,
}: {
  post: WebsiteCollectionItem;
  index: number;
}) {
  const swatches = ["#fff7ed", "#ecfeff", "#f5f3ff", "#f0fdf4"];

  return (
    <article
      style={{
        background: swatches[index % swatches.length],
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: 28,
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        display: "grid",
        overflow: "hidden",
      }}
    >
      {post.imageUrl ? (
        <img
          alt={post.title}
          src={post.imageUrl}
          style={{
            aspectRatio: "16 / 10",
            display: "block",
            objectFit: "cover",
            width: "100%",
          }}
        />
      ) : null}
      <div style={{ padding: 24 }}>
        <p
          style={{
            color: "rgba(22, 33, 62, 0.58)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            margin: "0 0 10px",
            textTransform: "uppercase",
          }}
        >
          {post.category || "School Story"} / {formatDate(post.publishedAt)}
        </p>
        <h3
          style={{
            color: "#16213e",
            fontSize: 24,
            lineHeight: 1.15,
            margin: "0 0 12px",
          }}
        >
          {post.title}
        </h3>
        <p
          style={{
            color: "rgba(22, 33, 62, 0.72)",
            lineHeight: 1.7,
            margin: "0 0 18px",
          }}
        >
          {post.excerpt}
        </p>
        <a
          href={`/blog/${post.slug}`}
          style={{
            color: "#16213e",
            fontSize: 14,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Read story
        </a>
      </div>
    </article>
  );
}

function HomeBlogSection(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "home.blog", true)) {
    return null;
  }

  const theme = context.config.themeConfig;
  const posts = getBlogPosts(context).slice(0, 3);

  return (
    <section
      style={{
        margin: "0 auto",
        maxWidth: 1180,
        padding: "4px 24px 82px",
      }}
    >
      <div
        style={{
          alignItems: "end",
          display: "grid",
          gap: 18,
          gridTemplateColumns: "minmax(0, 1fr) auto",
          marginBottom: 24,
        }}
      >
        <div>
          <Text
            as="p"
            field="home.blog.kicker"
            style={{
              color: theme.primaryColor,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.08em",
              margin: "0 0 10px",
              textTransform: "uppercase",
            }}
          >
            School blog
          </Text>
          <Text
            as="h2"
            field="home.blog.title"
            style={{
              color: "#16213e",
              fontSize: "clamp(2rem, 4vw, 3.6rem)",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Stories from campus.
          </Text>
          <Text
            field="home.blog.body"
            style={{
              color: "rgba(22, 33, 62, 0.7)",
              fontSize: 17,
              lineHeight: 1.7,
              margin: "16px 0 0",
              maxWidth: 680,
            }}
          >
            A cheerful window into learning moments, school culture, family
            updates, and the everyday wins shaping our learners.
          </Text>
        </div>
        <a href="/blog" style={secondaryCtaStyle}>
          View all stories
        </a>
      </div>
      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {posts.map((post, index) => (
          <BlogCard key={post.id} post={post} index={index} />
        ))}
      </div>
    </section>
  );
}

function HomeAnnouncementSection(context: WebsiteTemplateRenderContext) {
  if (!isSectionVisible(context, "home.announcements", true)) {
    return null;
  }

  const theme = context.config.themeConfig;
  const announcements = getAnnouncements(context).slice(0, 3);

  return (
    <section
      style={{
        margin: "0 auto",
        maxWidth: 1180,
        padding: "0 24px 82px",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 18,
          gridTemplateColumns: "minmax(0, 0.8fr) minmax(260px, 1.2fr)",
        }}
      >
        <div>
          <Text
            as="p"
            field="home.announcements.kicker"
            style={{
              color: theme.primaryColor,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.08em",
              margin: "0 0 10px",
              textTransform: "uppercase",
            }}
          >
            Announcements
          </Text>
          <Text
            as="h2"
            field="home.announcements.title"
            style={{
              color: "#16213e",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              lineHeight: 1,
              margin: 0,
            }}
          >
            Notices families should see first.
          </Text>
          <Text
            field="home.announcements.body"
            style={{
              color: "rgba(22, 33, 62, 0.7)",
              fontSize: 17,
              lineHeight: 1.7,
              margin: "16px 0 0",
            }}
          >
            Keep admissions, events, deadline reminders, and important campus
            updates visible without turning the homepage into a notice board.
          </Text>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {announcements.map((announcement, index) => (
            <article
              key={announcement.id}
              style={{
                background: ["#f0fdf4", "#fff7ed", "#ecfeff"][index % 3],
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 24,
                padding: 22,
              }}
            >
              <p
                style={{
                  color: theme.primaryColor,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  margin: "0 0 8px",
                  textTransform: "uppercase",
                }}
              >
                {announcement.category || "School Update"} /{" "}
                {formatDate(announcement.publishedAt)}
              </p>
              <h3
                style={{
                  color: "#16213e",
                  fontSize: 22,
                  margin: "0 0 10px",
                }}
              >
                {announcement.title}
              </h3>
              <p
                style={{
                  color: "rgba(22, 33, 62, 0.72)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {announcement.excerpt}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage(context: WebsiteTemplateRenderContext) {
  const theme = context.config.themeConfig;

  return (
    <SiteShell>
      <div
        style={{
          background: `radial-gradient(circle at 12% 16%, ${theme.accentColor}33, transparent 30%), radial-gradient(circle at 88% 10%, #22c55e33, transparent 28%), linear-gradient(180deg, ${theme.secondaryColor}, #ffffff 60%)`,
        }}
      >
        <AnnouncementHeader context={context} />
        <TemplateNav context={context} />
        <section
          style={{
            display: "grid",
            gap: 36,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            margin: "0 auto",
            maxWidth: 1180,
            padding: "68px 24px 48px",
          }}
        >
          <div style={{ alignSelf: "center" }}>
            <Text
              as="p"
              field="home.hero.kicker"
              style={{
                color: theme.primaryColor,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                margin: "0 0 14px",
                textTransform: "uppercase",
              }}
            >
              Colourful K-12 Learning
            </Text>
            <Text
              as="h1"
              field="home.hero.title"
              style={{
                color: "#16213e",
                fontSize: "clamp(2.8rem, 7vw, 5.9rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                margin: 0,
              }}
            >
              Bright minds grow here.
            </Text>
            <Text
              field="home.hero.body"
              style={{
                color: "rgba(22, 33, 62, 0.74)",
                fontSize: 18,
                lineHeight: 1.75,
                margin: "24px 0 0",
                maxWidth: 620,
              }}
            >
              A joyful K-12 school experience where strong academics, caring
              teachers, creative clubs, and confident character formation meet.
            </Text>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 30,
              }}
            >
              <Button type="button">Start admissions</Button>
              <a href={getLoginHref(context)} style={secondaryCtaStyle}>
                Sign in to dashboard
              </a>
            </div>
          </div>
          <HeroImage context={context} />
        </section>

        {isSectionVisible(context, "home.cards", true) ? (
          <section
            style={{
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              margin: "0 auto",
              maxWidth: 1180,
              padding: "0 24px 72px",
            }}
          >
            {[
              [
                "home.card.one",
                "Playful classrooms",
                "Hands-on lessons, reading circles, STEM labs, and joyful discovery.",
              ],
              [
                "home.card.two",
                "Confident care",
                "Warm pastoral support helps every learner feel known and guided.",
              ],
              [
                "home.card.three",
                "Full-school rhythm",
                "Academics, clubs, sports, arts, and assemblies working together.",
              ],
            ].map(([key, title, body], index) => (
              <article
                key={key}
                style={{
                  background: ["#fff7ed", "#ecfeff", "#f5f3ff"][index],
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 26,
                  padding: 24,
                }}
              >
                <Text
                  as="h3"
                  field={`${key}.title`}
                  style={{
                    color: "#16213e",
                    fontSize: 22,
                    margin: "0 0 10px",
                  }}
                >
                  {title}
                </Text>
                <Text
                  field={`${key}.body`}
                  style={{
                    color: "rgba(22, 33, 62, 0.7)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {body}
                </Text>
              </article>
            ))}
          </section>
        ) : null}
        {isSectionVisible(context, "home.admissions", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 1180,
              padding: "0 24px 76px",
            }}
          >
            <AdmissionLinksSection
              context={context}
              title="Admissions are open."
              body="Start a school application online, review the class requirements, and send the documents the admissions team needs."
            />
          </section>
        ) : null}
        {HomeAnnouncementSection(context)}
        {HomeBlogSection(context)}
        <TemplateFooter context={context} />
      </div>
    </SiteShell>
  );
}

function AboutPage(context: WebsiteTemplateRenderContext) {
  const theme = context.config.themeConfig;

  return (
    <SiteShell>
      <div
        style={{
          background: `linear-gradient(180deg, ${theme.secondaryColor}, #ffffff 52%, #f8fafc)`,
        }}
      >
        <AnnouncementHeader context={context} />
        <TemplateNav context={context} />
        {isSectionVisible(context, "about.hero", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 980,
              padding: "72px 24px 42px",
            }}
          >
            <Text
              as="p"
              field="about.hero.kicker"
              style={{
                color: theme.primaryColor,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                margin: "0 0 14px",
                textTransform: "uppercase",
              }}
            >
              About our school
            </Text>
            <Text
              as="h1"
              field="about.hero.title"
              style={{
                color: "#16213e",
                fontSize: "clamp(2.4rem, 6vw, 4.9rem)",
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
              }}
            >
              A colourful campus with a clear academic heartbeat.
            </Text>
            <Text
              field="about.hero.body"
              style={{
                color: "rgba(22, 33, 62, 0.74)",
                fontSize: 18,
                lineHeight: 1.8,
                margin: "26px 0 0",
                maxWidth: 760,
              }}
            >
              We combine structured teaching, meaningful relationships, and a
              lively school culture so children can grow with confidence from
              primary years through secondary preparation.
            </Text>
          </section>
        ) : null}
        <section
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            margin: "0 auto",
            maxWidth: 980,
            padding: "0 24px 76px",
          }}
        >
          {[
            [
              "Academic clarity",
              "Weekly learning goals and careful feedback keep progress visible.",
            ],
            [
              "Creative expression",
              "Art, music, clubs, sports, and leadership moments make school memorable.",
            ],
            [
              "Family partnership",
              "Clear communication helps parents understand each next step.",
            ],
          ].map(([title, body], index) => (
            <article
              key={title}
              style={{
                background: ["#ecfeff", "#fff7ed", "#f0fdf4"][index],
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 26,
                padding: 24,
              }}
            >
              <h3
                style={{
                  color: "#16213e",
                  fontFamily: theme.headingFont,
                  fontSize: 22,
                  margin: "0 0 10px",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  color: "rgba(22, 33, 62, 0.7)",
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {body}
              </p>
            </article>
          ))}
        </section>
        <TemplateFooter context={context} />
      </div>
    </SiteShell>
  );
}

function AdmissionsPage(context: WebsiteTemplateRenderContext) {
  const theme = context.config.themeConfig;

  return (
    <SiteShell>
      <div
        style={{
          background: `linear-gradient(180deg, ${theme.secondaryColor}, #ffffff 48%, #f8fafc)`,
        }}
      >
        <AnnouncementHeader context={context} />
        <TemplateNav context={context} />
        {isSectionVisible(context, "admissions.hero", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 980,
              padding: "72px 24px 36px",
            }}
          >
            <Text
              as="p"
              field="admissions.hero.kicker"
              style={{
                color: theme.primaryColor,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0,
                margin: "0 0 14px",
                textTransform: "uppercase",
              }}
            >
              Admissions
            </Text>
            <Text
              as="h1"
              field="admissions.hero.title"
              style={{
                color: "#16213e",
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
              }}
            >
              Start your child&apos;s application.
            </Text>
            <Text
              field="admissions.hero.body"
              style={{
                color: "rgba(22, 33, 62, 0.74)",
                fontSize: 18,
                lineHeight: 1.8,
                margin: "24px 0 0",
                maxWidth: 760,
              }}
            >
              Choose an open admission link, select the right class, and submit
              the details the school needs for review.
            </Text>
          </section>
        ) : null}
        {isSectionVisible(context, "admissions.openLinks", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 1180,
              padding: "0 24px 82px",
            }}
          >
            <AdmissionLinksSection
              context={context}
              eyebrow="Open applications"
              title="Available admission forms"
              body="Each form shows the class options and requirements before parents submit."
            />
          </section>
        ) : null}
        <TemplateFooter context={context} />
      </div>
    </SiteShell>
  );
}

function BlogListPage(context: WebsiteTemplateRenderContext) {
  const theme = context.config.themeConfig;
  const posts = getBlogPosts(context);
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <SiteShell>
      <div
        style={{
          background: `linear-gradient(180deg, ${theme.secondaryColor}, #ffffff 48%, #f8fafc)`,
        }}
      >
        <AnnouncementHeader context={context} />
        <TemplateNav context={context} />
        {isSectionVisible(context, "blog-list.hero", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 1180,
              padding: "72px 24px 38px",
            }}
          >
            <Text
              as="p"
              field="blog-list.hero.kicker"
              style={{
                color: theme.primaryColor,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                margin: "0 0 14px",
                textTransform: "uppercase",
              }}
            >
              School blog
            </Text>
            <Text
              as="h1"
              field="blog-list.hero.title"
              style={{
                color: "#16213e",
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
                maxWidth: 860,
              }}
            >
              Campus stories, family notes, and learning highlights.
            </Text>
            <Text
              field="blog-list.hero.body"
              style={{
                color: "rgba(22, 33, 62, 0.74)",
                fontSize: 18,
                lineHeight: 1.8,
                margin: "24px 0 0",
                maxWidth: 760,
              }}
            >
              Follow the moments that make school feel alive: classroom
              progress, clubs, assemblies, celebrations, and the updates
              families care about.
            </Text>
          </section>
        ) : null}
        {featuredPost &&
        isSectionVisible(context, "blog-list.featured", true) ? (
          <section
            style={{
              margin: "0 auto",
              maxWidth: 1180,
              padding: "0 24px 32px",
            }}
          >
            <article
              style={{
                alignItems: "stretch",
                background: "#ffffff",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 32,
                boxShadow: "0 30px 80px rgba(15, 23, 42, 0.1)",
                display: "grid",
                gap: 0,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                overflow: "hidden",
              }}
            >
              {featuredPost.imageUrl ? (
                <img
                  alt={featuredPost.title}
                  src={featuredPost.imageUrl}
                  style={{
                    display: "block",
                    height: "100%",
                    minHeight: 320,
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
              ) : null}
              <div style={{ padding: 34 }}>
                <p
                  style={{
                    color: theme.primaryColor,
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    margin: "0 0 12px",
                    textTransform: "uppercase",
                  }}
                >
                  Featured story / {formatDate(featuredPost.publishedAt)}
                </p>
                <h2
                  style={{
                    color: "#16213e",
                    fontSize: "clamp(2rem, 4vw, 3.2rem)",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {featuredPost.title}
                </h2>
                <p
                  style={{
                    color: "rgba(22, 33, 62, 0.72)",
                    fontSize: 18,
                    lineHeight: 1.75,
                    margin: "20px 0 26px",
                  }}
                >
                  {featuredPost.excerpt}
                </p>
                <a
                  href={`/blog/${featuredPost.slug}`}
                  style={secondaryCtaStyle}
                >
                  Read featured story
                </a>
              </div>
            </article>
          </section>
        ) : null}
        {isSectionVisible(context, "blog-list.posts", true) ? (
          <section
            style={{
              display: "grid",
              gap: 22,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              margin: "0 auto",
              maxWidth: 1180,
              padding: "0 24px 82px",
            }}
          >
            {(remainingPosts.length ? remainingPosts : posts).map(
              (post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ),
            )}
          </section>
        ) : null}
        <TemplateFooter context={context} />
      </div>
    </SiteShell>
  );
}

function BlogPostPage(context: WebsiteTemplateRenderContext) {
  const theme = context.config.themeConfig;
  const posts = getBlogPosts(context);
  const post = posts.find((item) => item.slug === context.routeSlug) ?? null;

  if (!post) {
    return null;
  }

  return (
    <SiteShell>
      <div
        style={{
          background: `linear-gradient(180deg, ${theme.secondaryColor}, #ffffff 42%, #f8fafc)`,
        }}
      >
        <AnnouncementHeader context={context} />
        <TemplateNav context={context} />
        <article
          style={{
            margin: "0 auto",
            maxWidth: 980,
            padding: "64px 24px 82px",
          }}
        >
          <a href="/blog" style={secondaryCtaStyle}>
            Back to blog
          </a>
          <p
            style={{
              color: theme.primaryColor,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.08em",
              margin: "34px 0 14px",
              textTransform: "uppercase",
            }}
          >
            {post.category || "School Story"} / {formatDate(post.publishedAt)}
          </p>
          <h1
            style={{
              color: "#16213e",
              fontFamily: theme.headingFont,
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              fontWeight: 900,
              lineHeight: 1,
              margin: 0,
            }}
          >
            {post.title}
          </h1>
          <p
            style={{
              color: "rgba(22, 33, 62, 0.72)",
              fontSize: 20,
              lineHeight: 1.75,
              margin: "24px 0 34px",
              maxWidth: 760,
            }}
          >
            {post.excerpt}
          </p>
          {post.imageUrl ? (
            <img
              alt={post.title}
              src={post.imageUrl}
              style={{
                aspectRatio: "16 / 9",
                borderRadius: 32,
                boxShadow: "0 34px 90px rgba(15, 23, 42, 0.14)",
                display: "block",
                objectFit: "cover",
                width: "100%",
              }}
            />
          ) : null}
          <div
            style={{
              color: "rgba(22, 33, 62, 0.78)",
              fontSize: 18,
              lineHeight: 1.9,
              marginTop: 34,
              whiteSpace: "pre-wrap",
            }}
          >
            {post.body}
          </div>
        </article>
        <TemplateFooter context={context} />
      </div>
    </SiteShell>
  );
}

function NotConfiguredPage(context: WebsiteTemplateRenderContext) {
  return context.pageKey === "about" ? AboutPage(context) : HomePage(context);
}

const navLinkStyle: CSSProperties = {
  color: "rgba(22, 33, 62, 0.76)",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
};

const secondaryCtaStyle: CSSProperties = {
  alignItems: "center",
  border: "1px solid rgba(22, 33, 62, 0.14)",
  borderRadius: 999,
  color: "#16213e",
  display: "inline-flex",
  fontSize: 14,
  fontWeight: 800,
  minHeight: 44,
  padding: "0 18px",
  textDecoration: "none",
};

const renderers: Record<
  WebsiteTemplatePageKey,
  WebsiteTemplateDefinition["renderers"][WebsiteTemplatePageKey]
> = {
  home: HomePage,
  about: AboutPage,
  admissions: AdmissionsPage,
  "blog-list": BlogListPage,
  "blog-post": BlogPostPage,
  "event-list": NotConfiguredPage,
  "event-post": NotConfiguredPage,
  "resource-list": NotConfiguredPage,
  "resource-post": NotConfiguredPage,
  contact: NotConfiguredPage,
};

export const k12PlusTemplate4 = defineWebsiteTemplate({
  manifest: {
    id: "k12-plus-template-4",
    name: "Kaleidoscope",
    institutionTypes: ["K12", "PRIMARY", "SECONDARY"],
    supportedPlans: ["PLUS", "PRO", "ENTERPRISE"],
    description:
      "A bright, neat, colourful K-12 template focused on confident first impressions and shared dashboard sign-in.",
    thumbnail: "/templates/k12-plus-template-4/thumbnail.svg",
    previewImages: ["/templates/k12-plus-template-4/thumbnail.svg"],
    tags: ["colorful", "k-12", "neat", "joyful"],
    features: ["home", "about", "admissions", "blog", "global-dashboard-login"],
    pages: [
      {
        key: "home",
        label: "Home",
        route: "/",
        sections: [
          {
            key: "site.announcement-header",
            label: "Announcement header",
            defaultVisible: true,
            editables: [],
          },
          {
            key: "home.hero",
            label: "Hero",
            defaultVisible: true,
            required: true,
            editables: [
              {
                key: "home.hero.kicker",
                label: "Hero kicker",
                description:
                  "Short colourful eyebrow above the homepage headline.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.hero.title",
                label: "Hero title",
                description: "Main homepage headline.",
                contentType: "short-text",
                sizeGuidance: "4-9 words",
              },
              {
                key: "home.hero.body",
                label: "Hero body",
                description: "Short homepage positioning copy.",
                contentType: "long-text",
                sizeGuidance: "25-60 words",
              },
              {
                key: "home.hero.imageUrl",
                label: "Hero image",
                description: "Public image URL for the homepage hero.",
                contentType: "image-url",
                sizeGuidance: "single image URL",
              },
              {
                key: "site.login.href",
                label: "Dashboard login URL",
                description:
                  "Shared dashboard login link. Auth remains global and outside template pages.",
                contentType: "short-text",
                sizeGuidance: "URL",
              },
            ],
          },
          {
            key: "home.cards",
            label: "Homepage cards",
            defaultVisible: true,
            editables: [
              {
                key: "home.card.one.title",
                label: "First card title",
                description: "Title for the first homepage value card.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.card.one.body",
                label: "First card body",
                description: "Body text for the first homepage value card.",
                contentType: "long-text",
                sizeGuidance: "12-24 words",
              },
            ],
          },
          {
            key: "home.admissions",
            label: "Admission links",
            defaultVisible: true,
            editables: [],
          },
          {
            key: "home.blog",
            label: "Blog preview",
            defaultVisible: true,
            editables: [
              {
                key: "home.blog.kicker",
                label: "Blog kicker",
                description: "Short eyebrow above the homepage blog preview.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "home.blog.title",
                label: "Blog preview title",
                description: "Homepage heading for the latest school stories.",
                contentType: "short-text",
                sizeGuidance: "3-8 words",
              },
              {
                key: "home.blog.body",
                label: "Blog preview body",
                description: "Short explanation for the homepage blog preview.",
                contentType: "long-text",
                sizeGuidance: "20-45 words",
              },
            ],
          },
          {
            key: "home.announcements",
            label: "Announcements",
            defaultVisible: true,
            editables: [
              {
                key: "home.announcements.kicker",
                label: "Announcement kicker",
                description: "Short eyebrow above the announcement section.",
                aiDescription:
                  "Write a tiny label for a K-12 homepage announcement block, warm and practical.",
                contentType: "short-text",
                sizeGuidance: "1-4 words",
              },
              {
                key: "home.announcements.title",
                label: "Announcement title",
                description: "Homepage heading for important school updates.",
                aiDescription:
                  "Write a confident heading that makes family notices feel visible but not alarming.",
                contentType: "short-text",
                sizeGuidance: "4-9 words",
              },
              {
                key: "home.announcements.body",
                label: "Announcement body",
                description:
                  "Short intro for the homepage announcements block.",
                aiDescription:
                  "Explain that this section keeps families aware of deadlines, events, and campus updates.",
                contentType: "long-text",
                sizeGuidance: "18-45 words",
              },
              createAnnouncementCardBlockField({
                key: "cms.announcements",
                label: "Announcement CMS blocks",
                description:
                  "Tenant-managed announcements that can appear in the header and homepage announcement section.",
                sizeGuidance: "2-5 items",
              }),
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
            key: "admissions.hero",
            label: "Admissions hero",
            defaultVisible: true,
            editables: [
              {
                key: "admissions.hero.kicker",
                label: "Admissions kicker",
                description: "Short eyebrow above the admissions page headline.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "admissions.hero.title",
                label: "Admissions title",
                description: "Main admissions page headline.",
                contentType: "short-text",
                sizeGuidance: "5-12 words",
              },
              {
                key: "admissions.hero.body",
                label: "Admissions body",
                description: "Short intro for the admissions page.",
                contentType: "long-text",
                sizeGuidance: "25-70 words",
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
        key: "about",
        label: "About",
        route: "/about",
        sections: [
          {
            key: "about.hero",
            label: "About hero",
            defaultVisible: true,
            editables: [
              {
                key: "about.hero.kicker",
                label: "About kicker",
                description: "Short eyebrow above the about page headline.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "about.hero.title",
                label: "About title",
                description: "Main about page headline.",
                contentType: "short-text",
                sizeGuidance: "5-12 words",
              },
              {
                key: "about.hero.body",
                label: "About body",
                description: "Short about page story.",
                contentType: "long-text",
                sizeGuidance: "35-90 words",
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
            key: "blog-list.hero",
            label: "Blog hero",
            defaultVisible: true,
            editables: [
              {
                key: "blog-list.hero.kicker",
                label: "Blog kicker",
                description: "Short eyebrow above the blog page headline.",
                contentType: "short-text",
                sizeGuidance: "2-5 words",
              },
              {
                key: "blog-list.hero.title",
                label: "Blog title",
                description: "Main blog page headline.",
                contentType: "short-text",
                sizeGuidance: "5-12 words",
              },
              {
                key: "blog-list.hero.body",
                label: "Blog body",
                description: "Short intro for the blog page.",
                contentType: "long-text",
                sizeGuidance: "25-70 words",
              },
            ],
          },
          {
            key: "blog-list.posts",
            label: "Blog posts",
            defaultVisible: true,
            editables: [],
          },
          {
            key: "blog-list.featured",
            label: "Featured story",
            defaultVisible: true,
            editables: [],
          },
        ],
      },
      {
        key: "blog-post",
        label: "Blog Post",
        route: "/blog/[slug]",
        sections: [
          {
            key: "blog-post.article",
            label: "Blog article",
            defaultVisible: true,
            editables: [],
          },
        ],
      },
    ],
    themeSchema: {
      colorSlots: ["primary", "secondary", "accent", "surface"],
      headingFontOptions: ["Raleway", "Cal Sans", "Nunito Sans"],
      bodyFontOptions: ["Raleway", "Inter", "Nunito Sans"],
      radiusOptions: ["md", "lg", "full"],
      densityOptions: ["comfortable", "airy"],
      stylePresets: ["lyra", "maia", "bright-campus"],
    },
    defaultThemeConfig: {
      primaryColor: "#7c3aed",
      secondaryColor: "#fdf4ff",
      accentColor: "#f97316",
      surfaceColor: "#ffffff",
      headingFont: "Raleway",
      bodyFont: "Raleway",
      radius: "lg",
      density: "airy",
      stylePreset: "lyra",
      baseColor: "taupe",
      theme: "#f97316",
      chartColor: "#f97316",
      iconLibrary: "lucide",
      menuStyle: "translucent",
      menuAccent: "subtle",
    },
    dataRequirements: [
      "school-profile",
      "announcements",
      "admission-links",
      "blog-posts",
      "global-dashboard-login",
    ],
  },
  renderers,
});
