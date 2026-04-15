import type { EditableFieldDefinition, WebsiteTenantProfile } from "./types";

export type WebsiteFieldAiAction =
  | "generate"
  | "shorten"
  | "expand"
  | "professional";

type GenerateFieldSuggestionInput = {
  action: WebsiteFieldAiAction;
  currentValue: string;
  field: EditableFieldDefinition;
  tenant: WebsiteTenantProfile;
  pageLabel: string;
  sectionLabel: string;
};

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function generateFieldSuggestion(
  input: GenerateFieldSuggestionInput
): string {
  const current = trimSentence(input.currentValue);
  const school = input.tenant.schoolName;

  if (input.action === "shorten") {
    const words = current.split(" ").filter(Boolean);
    if (words.length <= 8) return current || `Discover ${school}`;
    return sentenceCase(words.slice(0, 8).join(" "));
  }

  if (input.action === "expand") {
    if (!current) {
      return sentenceCase(
        `${school} helps families understand the ${input.pageLabel.toLowerCase()} experience with clear, reassuring details.`
      );
    }
    return sentenceCase(
      `${current} Designed to feel clear, credible, and welcoming for families exploring ${school}.`
    );
  }

  if (input.action === "professional") {
    const base =
      current ||
      `${school} offers a structured and welcoming learning environment.`;
    return sentenceCase(
      `${trimSentence(base)} ${input.pageLabel} content should feel polished, trustworthy, and parent-friendly.`
    );
  }

  const contentType = input.field.contentType;
  const label = input.field.label.toLowerCase();

  if (contentType === "short-text") {
    return sentenceCase(
      `${school} ${label.includes("title") ? "welcomes ambitious learners" : "now open"}`
    );
  }

  if (contentType === "cta") {
    return "Schedule a Campus Visit";
  }

  if (contentType === "image-url" || contentType === "media-asset") {
    return "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80";
  }

  if (contentType === "list") {
    return [
      "Strong academics",
      "Warm student support",
      "Clear admissions guidance",
    ].join("\n");
  }

  if (contentType === "object-list") {
    return JSON.stringify(
      [
        {
          title: "Confident first impressions",
          description:
            "Families immediately understand the school story and admissions journey.",
        },
        {
          title: "Structured public content",
          description:
            "Repeatable blocks keep testimonials, gallery cards, and highlights consistent.",
        },
      ],
      null,
      2
    );
  }

  return sentenceCase(
    `${school} presents ${input.sectionLabel.toLowerCase()} content for the ${input.pageLabel.toLowerCase()} page with a warm, trustworthy tone for prospective families.`
  );
}
