import { env } from "@/config";
import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIModel(model: string) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI_PROVIDER=openai");
  }

  const provider = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return provider(model);
}
