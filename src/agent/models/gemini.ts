import { env } from "@/config";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGoogleModel(model: string) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for AI_PROVIDER=google");
  }

  const provider = createGoogleGenerativeAI({
    apiKey: env.GEMINI_API_KEY,
  });

  return provider(model);
}
