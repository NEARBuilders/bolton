import {
  ActionToolProgress,
  ActionToolResult,
  amountSchema,
  tokenRefSchema,
} from "@/agent/types";
import {
  ApproveToolStatus,
  createApprovalId,
  waitForApproval,
} from "@/bot/ai/approval";
import { executeSwapQuote, getSwapQuote } from "@/services/swap";
import { tool } from "ai";
import { stringify } from "viem";
import z from "zod";
import {
  getToolContext,
  getWalletConfig,
  resolveTokenRefOrThrow,
} from "./shared";

function getApprovalFailureMessage(status: ApproveToolStatus): string | null {
  if (status === ApproveToolStatus.REJECTED) {
    return "Swap cancelled by user";
  }
  if (status === ApproveToolStatus.TIMEOUT) {
    return "Swap approval timeout";
  }
  return null;
}

export const getSwapTools = () => {
  return {
    executeSwap: tool({
      description: "Execute a token swap transaction",
      inputSchema: z.object({
        fromToken: tokenRefSchema,
        toToken: tokenRefSchema,
        amount: amountSchema,
      }),
      async execute(
        { fromToken, toToken, amount },
        { experimental_context }
      ): Promise<ActionToolProgress | ActionToolResult> {
        try {
          const context = getToolContext(experimental_context);
          const { walletAddress, privateKey } = getWalletConfig();
          const resolvedFrom = await resolveTokenRefOrThrow(fromToken, {
            walletAddress,
          });
          const resolvedTo = await resolveTokenRefOrThrow(toToken, {
            walletAddress,
          });

          const quote = await getSwapQuote({
            walletAddress,
            fromTokenId: resolvedFrom.intentsTokenId,
            toTokenId: resolvedTo.intentsTokenId,
            amount,
          });

          if (quote.status === "error") {
            return {
              kind: "action-result",
              ok: false,
              message: quote.message,
            };
          }

          const approvalId = createApprovalId("swap");
          const approvalResponse = await waitForApproval({
            userId: walletAddress,
            id: approvalId,
            context: {
              autoApprove: false,
              telegramUserId: context.telegramUserId,
              botApi: context.botApi,
            },
            approvalData: {
              kind: "swap",
              fromAmount: quote.amountInFormatted,
              fromTokenSymbol: resolvedFrom.symbol,
              toAmount: quote.amountOutFormatted,
              toTokenSymbol: resolvedTo.symbol,
              fromChain: resolvedFrom.blockchain,
              toChain: resolvedTo.blockchain,
            },
          });

          const approvalFailureMessage = getApprovalFailureMessage(
            approvalResponse.status
          );
          if (approvalFailureMessage) {
            return {
              kind: "action-result",
              ok: false,
              message: approvalFailureMessage,
            };
          }

          const result = await executeSwapQuote({
            privateKey,
            walletAddress,
            quote: quote.quote,
          });

          if (result.status !== "success") {
            return {
              kind: "action-result",
              ok: false,
              message: result.message ?? "Swap failed",
            };
          }

          return {
            kind: "action-result",
            ok: true,
            message: "Swap submitted successfully",
            data: result,
          };
        } catch (error) {
          console.error("Swap tool failed:", error);
          return {
            kind: "action-result",
            ok: false,
            message: stringify(
              error instanceof Error ? error.message : "Swap failed"
            ),
          };
        }
      },
    }),
  };
};
