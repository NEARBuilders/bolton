import { tool } from "ai";
import z from "zod";
import { getSupportedTokens, searchTokens } from "@/services/tokens";
import { ViewToolResult } from "@/agent/types";

export const getTokensTools = () => {
  return {
    getTokens: tool({
      description: "List supported tokens",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).optional(),
      }),
      execute: async ({ limit }): Promise<ViewToolResult> => {
        try {
          const resolvedLimit = limit ?? 20;
          const tokens = (await getSupportedTokens()).slice(0, resolvedLimit);

          return {
            kind: "view",
            ok: true,
            message: `Found ${tokens.length} tokens`,
            data: {
              query: null,
              tokens,
            },
          };
        } catch (error) {
          console.error("getTokens failed:", error);
          return {
            kind: "view",
            ok: false,
            message:
              error instanceof Error ? error.message : "Failed to get tokens",
          };
        }
      },
    }),
    searchToken: tool({
      description:
        "Search supported tokens by symbol, token id, blockchain, or fuzzy query",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(100).optional(),
      }),
      execute: async ({ query, limit }): Promise<ViewToolResult> => {
        try {
          const resolvedLimit = limit ?? 20;
          const tokens = await searchTokens(query, { limit: resolvedLimit });

          return {
            kind: "view",
            ok: true,
            message: `Found ${tokens.length} tokens for "${query}"`,
            data: {
              query,
              tokens,
            },
          };
        } catch (error) {
          console.error("searchToken failed:", error);
          return {
            kind: "view",
            ok: false,
            message:
              error instanceof Error ? error.message : "Failed to search token",
          };
        }
      },
    }),
  };
};
