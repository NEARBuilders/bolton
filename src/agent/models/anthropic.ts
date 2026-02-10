import { env } from "@/config";
import { createAnthropic } from "@ai-sdk/anthropic";

export function getAnthropicModel(model: string) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for AI_PROVIDER=anthropic");
  }

  const provider = createAnthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  return provider(model);
}
