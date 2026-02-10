import { getNearAddressFromKeyPair } from "@/services/near-intents/index.js";
import { KeyPair } from "near-api-js";
import z from "zod";

import type { KeyPairString } from "./types/near.js";

export type AiProvider = "openai" | "anthropic" | "google" | "xai" | "near";

const EnvSchema = z
  .object({
    DEFUSE_JWT_TOKEN: z.string().optional(),
    BOT_TOKEN: z.string(),
    WALLET_PRIVATE_KEY: z.string(),
    TELEGRAM_USER_ID: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    TELEGRAM_USER_IDS: z.string().optional(),

    AI_PROVIDER: z.enum(["openai", "anthropic", "google", "xai", "near"]),
    AI_MODEL: z.string().optional(),
    AI_OPENAI_MODEL: z.string().optional(),
    AI_ANTHROPIC_MODEL: z.string().optional(),
    AI_GOOGLE_MODEL: z.string().optional(),
    AI_XAI_MODEL: z.string().optional(),
    AI_NEAR_MODEL: z.string().optional(),

    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    XAI_API_KEY: z.string().optional(),
    NEAR_AI_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.TELEGRAM_USER_ID && !data.TELEGRAM_USER_IDS) {
      ctx.addIssue({
        code: "custom",
        message: "Provide TELEGRAM_USER_ID or TELEGRAM_USER_IDS for allowlist access",
      });
    }

    const modelByProvider: Record<AiProvider, string | undefined> = {
      openai: data.AI_OPENAI_MODEL,
      anthropic: data.AI_ANTHROPIC_MODEL,
      google: data.AI_GOOGLE_MODEL,
      xai: data.AI_XAI_MODEL,
      near: data.AI_NEAR_MODEL,
    };
    const model = modelByProvider[data.AI_PROVIDER] ?? data.AI_MODEL;
    if (!model) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide AI_MODEL or the provider-specific model env var for the selected AI_PROVIDER",
      });
    }

    const hasProviderKey =
      (data.AI_PROVIDER === "openai" && Boolean(data.OPENAI_API_KEY)) ||
      (data.AI_PROVIDER === "anthropic" && Boolean(data.ANTHROPIC_API_KEY)) ||
      (data.AI_PROVIDER === "google" && Boolean(data.GEMINI_API_KEY)) ||
      (data.AI_PROVIDER === "xai" && Boolean(data.XAI_API_KEY)) ||
      (data.AI_PROVIDER === "near" && Boolean(data.NEAR_AI_KEY));

    if (!hasProviderKey) {
      ctx.addIssue({
        code: "custom",
        message: "Provide the API key env var required by the selected AI_PROVIDER",
      });
    }
  });

export const env = EnvSchema.parse(process.env);

export interface WalletConfig {
  privateKey: KeyPairString;
  walletAddress: string;
}

export interface AiConfig {
  provider: AiProvider;
  model: string;
}

export function loadConfig(): WalletConfig {
  const keyPair = KeyPair.fromString(env.WALLET_PRIVATE_KEY as KeyPairString);
  const walletAddress = getNearAddressFromKeyPair(keyPair);

  return {
    privateKey: env.WALLET_PRIVATE_KEY as KeyPairString,
    walletAddress,
  };
}

export function tryLoadConfig(): WalletConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}

export function getApiKey(): string | undefined {
  return env.DEFUSE_JWT_TOKEN;
}

export function loadAiConfig(): AiConfig {
  const provider = env.AI_PROVIDER;

  const modelByProvider: Record<AiProvider, string | undefined> = {
    openai: env.AI_OPENAI_MODEL,
    anthropic: env.AI_ANTHROPIC_MODEL,
    google: env.AI_GOOGLE_MODEL,
    xai: env.AI_XAI_MODEL,
    near: env.AI_NEAR_MODEL,
  };

  const model = modelByProvider[provider] ?? env.AI_MODEL;
  if (!model) {
    throw new Error(
      "AI model is missing. Set AI_MODEL or provider-specific AI_*_MODEL."
    );
  }

  return {
    provider,
    model,
  };
}
