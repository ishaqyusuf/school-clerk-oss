"use server";

import { env } from "@/env";
import {
  generateFieldSuggestion,
  type EditableFieldDefinition,
  type WebsiteFieldAiAction,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";

type GenerateWebsiteFieldAiInput = {
  action: WebsiteFieldAiAction;
  currentValue: string;
  field: EditableFieldDefinition;
  tenant: WebsiteTenantProfile;
  pageLabel: string;
  sectionLabel: string;
};

function buildPrompt(input: GenerateWebsiteFieldAiInput) {
  return [
    `School: ${input.tenant.schoolName}`,
    `Institution type: ${input.tenant.institutionType}`,
    `Page: ${input.pageLabel}`,
    `Section: ${input.sectionLabel}`,
    `Field label: ${input.field.label}`,
    `Field description: ${input.field.description}`,
    `Content type: ${input.field.contentType}`,
    `Size guidance: ${input.field.sizeGuidance}`,
    input.field.tone ? `Tone: ${input.field.tone}` : null,
    `Requested action: ${input.action}`,
    `Current value: ${input.currentValue || "(empty)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateWebsiteFieldAi(
  input: GenerateWebsiteFieldAiInput
) {
  if (!env.OPENAI_API_KEY) {
    return {
      text: generateFieldSuggestion(input),
      source: "fallback" as const,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "You write concise, high-conviction school website copy. Return plain text only, keep within the requested size guidance, and do not add quotation marks or headings.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const json = (await response.json()) as {
      output_text?: string;
    };

    const text = (json.output_text ?? "").trim();

    return {
      text: text || generateFieldSuggestion(input),
      source: "openai" as const,
    };
  } catch (error) {
    console.error("generateWebsiteFieldAi failed", error);

    return {
      text: generateFieldSuggestion(input),
      source: "fallback" as const,
    };
  }
}
