import { env } from "@/config";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getNearModel(model: string) {
  if (!env.NEAR_AI_KEY) {
    throw new Error("NEAR_AI_KEY is required for AI_PROVIDER=near");
  }

  const provider = createOpenAICompatible({
    name: "near",
    baseURL: "https://cloud-api.near.ai/v1",
    headers: {
      Authorization: `Bearer ${env.NEAR_AI_KEY}`,
    },
  });

  return provider(model);
}
