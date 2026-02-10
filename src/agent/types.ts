import z from "zod";

export const tokenRefSchema = z
  .string()
  .min(1)
  .describe("Token symbol or intents token id, e.g. USDC or near:eth-0xa0b8...");

export const amountSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal string")
  .describe("Amount as decimal string, e.g. 10 or 0.5");

export const addressSchema = z
  .string()
  .min(10)
  .describe("Destination wallet address");

export const cronSchema = z
  .string()
  .min(1)
  .describe("Cron expression in UTC, e.g. 0 * * * *");

export type ActionPhase = "validated" | "submitting";

export interface ViewToolResult<T = unknown> {
  kind: "view";
  ok: boolean;
  message: string;
  data?: T;
}

export interface ActionToolProgress<T = unknown> {
  kind: "action-progress";
  phase: ActionPhase;
  message: string;
  data?: T;
}

export interface ActionToolResult<T = unknown> {
  kind: "action-result";
  ok: boolean;
  message: string;
  data?: T;
}
