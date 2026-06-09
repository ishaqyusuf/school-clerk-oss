import { anthropic } from "@ai-sdk/anthropic";
import { deepseek } from "@ai-sdk/deepseek";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export type AiProviderConfig = {
  preferredProvider?: string | null;
  preferredModel?: string | null;
  fallbackProvider?: string;
};

export function getAiModelSelection(config: AiProviderConfig) {
  const provider =
    config.preferredProvider || config.fallbackProvider || "deepseek";

  if (provider === "openai") {
    const modelName = config.preferredModel || "gpt-4o";
    return { provider, modelName, model: openai(modelName) };
  }

  if (provider === "deepseek") {
    const modelName = config.preferredModel || "deepseek-chat";
    return { provider, modelName, model: deepseek(modelName) };
  }

  if (provider === "gemini") {
    const modelName = config.preferredModel || "gemini-2.0-flash";
    return { provider, modelName, model: google(modelName) };
  }

  const modelName = config.preferredModel || "claude-sonnet-4-6";
  return { provider: "anthropic", modelName, model: anthropic(modelName) };
}

export const getModelSelection = getAiModelSelection;
