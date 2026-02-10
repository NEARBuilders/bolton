import type { LanguageModel } from "ai";
import type { AiConfig } from "@/config";
import { getAnthropicModel } from "./anthropic";
import { getGoogleModel } from "./gemini";
import { getNearModel } from "./near";
import { getOpenAIModel } from "./openai";
import { getXaiModel } from "./xai";

export function getModelFromAiConfig(config: AiConfig): LanguageModel {
  switch (config.provider) {
    case "openai":
      return getOpenAIModel(config.model);
    case "anthropic":
      return getAnthropicModel(config.model);
    case "google":
      return getGoogleModel(config.model);
    case "xai":
      return getXaiModel(config.model);
    case "near":
      return getNearModel(config.model);
    default: {
      const exhaustive: never = config.provider;
      throw new Error(`Unsupported AI provider: ${exhaustive}`);
    }
  }
}
