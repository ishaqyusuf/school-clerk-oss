import type {
  WebsiteTemplateConfiguration,
  WebsiteTenantProfile,
} from "./types";

export const mockTenantProfile: WebsiteTenantProfile = {
  schoolProfileId: "demo-school-profile",
  schoolName: "Greenfield K-12 Academy",
  institutionType: "K12",
  subdomain: "greenfield",
  customDomain: null,
};

export const mockPublishedWebsiteConfig: WebsiteTemplateConfiguration = {
  id: "demo-published-config",
  tenantId: mockTenantProfile.schoolProfileId,
  templateId: "k12-plus-template-1",
  name: "Launch Site",
  status: "published",
  content: {
    "home.hero.kicker": "Admissions Open 2026",
    "home.hero.title": "A brighter school website for modern families.",
    "home.hero.body":
      "Showcase programs, admissions, events, and news with a multi-page public experience that still feels true to your campus.",
    "home.hero.cta": "Start Admission Enquiry",
    "home.hero.highlights":
      "Future-ready learning\nWarm pastoral care\nClear admissions journey",
    "home.hero.imageUrl":
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    "home.hero.testimonials": [
      {
        quote:
          "The website finally reflects the confidence we want families to feel about the school.",
        name: "Mrs. Adebayo",
        role: "Parent Community Lead",
      },
      {
        quote:
          "Admissions conversations now start with clearer expectations and stronger trust.",
        name: "Admissions Office",
        role: "Enrollment Team",
      },
    ],
    "home.hero.gallery": [
      {
        title: "Welcome to Campus",
        description: "Use lifestyle imagery to establish warmth from the first scroll.",
        imageUrl:
          "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Modern Learning Spaces",
        description: "Show classrooms and learning environments that support your positioning.",
        imageUrl:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    "home.features.cards": [
      {
        title: "Multi-page template support",
        description:
          "Structure the public site around real school journeys instead of a single landing page.",
      },
      {
        title: "Inline editable field architecture",
        description:
          "Let school teams update approved content quickly without breaking layout or structure.",
      },
      {
        title: "Preview and live mode alignment",
        description:
          "Keep draft editing close to production behavior so publish outcomes stay predictable.",
      },
    ],
    "home.stats.cards": [
      {
        value: "98%",
        label: "Parent satisfaction",
      },
      {
        value: "12:1",
        label: "Student-teacher ratio",
      },
      {
        value: "24",
        label: "Clubs and enrichment paths",
      },
    ],
    "home.staff.cards": [
      {
        name: "Mrs. Amina Yusuf",
        role: "Head of School",
        bio: "Leads the school with a strong focus on academic clarity, family trust, and student formation.",
        imageUrl:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Mr. Daniel Okafor",
        role: "Admissions Director",
        bio: "Guides families from first enquiry to confident enrollment with a warm and structured process.",
        imageUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
      },
    ],
    "home.announcements.cards": [
      {
        date: "May 12, 2026",
        title: "Open Day Registration Now Live",
        description: "Families can now reserve a place for campus tours, classroom visits, and admissions Q&A.",
      },
      {
        date: "June 03, 2026",
        title: "Scholarship Screening Window Opens",
        description: "Application instructions and eligibility guidance are now available for prospective families.",
      },
    ],
    "about.story.title": "Built for confident first impressions",
    "about.story.body":
      "Greenfield combines warm pastoral care with structured academic growth from early years through graduation.",
    "admissions.process.title": "Simple admissions, clear next steps",
    "admissions.process.body":
      "Help prospective parents move from curiosity to application with requirements, timelines, and campus touchpoints.",
    "blog-list.intro.title": "Stories from around campus",
    "blog-list.intro.body":
      "Share school highlights, academic wins, excursions, and community updates in a format families can revisit.",
    "contact.info.title": "Talk with our admissions team",
    "contact.info.body":
      "Reach the school office for tours, application guidance, and enrollment support.",
  },
  sectionVisibility: {
    "home.hero": true,
    "home.stats": true,
    "about.story": true,
    "admissions.process": true,
    "blog-list.intro": true,
    "contact.info": true,
  },
  themeConfig: {
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
  seoConfig: {
    "pages.home.title": "Greenfield K-12 Academy",
    "pages.home.description":
      "A warm, academic school website experience for prospective families.",
  },
  analyticsConfig: {},
};
