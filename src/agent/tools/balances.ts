import { ViewToolResult } from "@/agent/types";
import { getTokenBalances } from "@/services/balance";
import { tool } from "ai";
import z from "zod";
import { getWalletConfig } from "./shared";

function searchBalancesByQuery(
  balances: Awaited<ReturnType<typeof getTokenBalances>>,
  query: string
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return balances;

  const exact = balances.filter(
    (token) =>
      token.symbol.toLowerCase() === normalized ||
      token.intentsTokenId.toLowerCase() === normalized ||
      token.nearTokenId.toLowerCase() === normalized ||
      token.defuseAssetIdentifier.toLowerCase() === normalized
  );
  if (exact.length > 0) {
    return exact;
  }

  return balances.filter(
    (token) =>
      token.symbol.toLowerCase().includes(normalized) ||
      token.intentsTokenId.toLowerCase().includes(normalized) ||
      token.nearTokenId.toLowerCase().includes(normalized) ||
      token.defuseAssetIdentifier.toLowerCase().includes(normalized) ||
      token.blockchain.toLowerCase().includes(normalized)
  );
}

export const getBalancesTools = () => {
  return {
    getBalances: tool({
      description: "Get wallet balances for the configured account",
      inputSchema: z.object({
        forceRefresh: z.boolean().optional(),
      }),
      execute: async ({ forceRefresh }): Promise<ViewToolResult> => {
        try {
          const { walletAddress } = getWalletConfig();
          const balances = await getTokenBalances({
            walletAddress,
            forceRefresh,
          });

          return {
            kind: "view",
            ok: true,
            message:
              balances.length === 0
                ? "No balances found"
                : `Found ${balances.length} non-zero balances`,
            data: {
              walletAddress,
              balances,
            },
          };
        } catch (error) {
          console.error("Balances tool failed:", error);
          return {
            kind: "view",
            ok: false,
            message: error instanceof Error ? error.message : "Balances failed",
          };
        }
      },
    }),
    searchTokenBalance: tool({
      description:
        "Search token balances in the configured wallet by symbol or token id",
      inputSchema: z.object({
        query: z.string().min(1),
        forceRefresh: z.boolean().optional(),
        limit: z.number().int().positive().max(100).optional(),
      }),
      execute: async ({ query, forceRefresh, limit }): Promise<ViewToolResult> => {
        try {
          const { walletAddress } = getWalletConfig();
          const balances = await getTokenBalances({
            walletAddress,
            forceRefresh,
          });
          const matched = searchBalancesByQuery(balances, query);
          const resolvedLimit = limit ?? 20;
          const limited = matched.slice(0, resolvedLimit);

          return {
            kind: "view",
            ok: true,
            message: `Found ${limited.length} token balances for "${query}"`,
            data: {
              walletAddress,
              query,
              balances: limited,
            },
          };
        } catch (error) {
          console.error("searchTokenBalance failed:", error);
          return {
            kind: "view",
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to search token balances",
          };
        }
      },
    }),
  };
};
