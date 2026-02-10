import { env } from "@/config";
import { createXai } from "@ai-sdk/xai";

export function getXaiModel(model: string) {
  if (!env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is required for AI_PROVIDER=xai");
  }

  const provider = createXai({
    apiKey: env.XAI_API_KEY,
  });

  return provider(model);
}
