import { ViewToolResult, tokenRefSchema } from "@/agent/types";
import { getDepositAddress } from "@/services/deposit";
import { AuthMethod } from "@defuse-protocol/internal-utils";
import { tool } from "ai";
import { stringify } from "viem";
import z from "zod";
import { getWalletConfig, resolveTokenRefOrThrow } from "./shared";

export const getDepositTools = () => {
  return {
    getDepositAddress: tool({
      description:
        "Get a deposit address for a token. Input can be token symbol or intents token id.",
      inputSchema: z.object({
        token: tokenRefSchema,
      }),
      execute: async ({ token }): Promise<ViewToolResult> => {
        try {
          const { walletAddress } = getWalletConfig();
          const resolvedToken = await resolveTokenRefOrThrow(token, {
            walletAddress,
          });

          const deposit = await getDepositAddress({
            authIdentifier: walletAddress,
            authMethod: AuthMethod.Near,
            assetId: resolvedToken.defuseAssetIdentifier,
          });

          return {
            kind: "view",
            ok: true,
            message: `Deposit address generated for ${resolvedToken.symbol}`,
            data: {
              token: resolvedToken,
              deposit,
            },
          };
        } catch (error) {
          console.error("getDepositAddress failed:", error);
          return {
            kind: "view",
            ok: false,
            message: stringify(
              error instanceof Error
                ? error.message
                : "Failed to get deposit address"
            ),
          };
        }
      },
    }),
  };
};
