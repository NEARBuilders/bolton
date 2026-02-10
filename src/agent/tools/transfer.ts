import {
  ActionToolProgress,
  ActionToolResult,
  addressSchema,
  amountSchema,
  tokenRefSchema,
} from "@/agent/types";
import {
  ApproveToolStatus,
  createApprovalId,
  waitForApproval,
} from "@/bot/ai/approval";
import { executeTransfer, getTransferQuote } from "@/services/transfer/service";
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
    return "Transfer cancelled by user";
  }
  if (status === ApproveToolStatus.TIMEOUT) {
    return "Transfer approval timeout";
  }
  return null;
}

export const getTransferTools = () => {
  return {
    executeTransfer: tool({
      description: "Execute a transfer transaction",
      inputSchema: z.object({
        token: tokenRefSchema,
        amount: amountSchema,
        toAddress: addressSchema,
      }),
      async execute(
        { token, amount, toAddress },
        { experimental_context }
      ): Promise<ActionToolProgress | ActionToolResult> {
        try {
          const context = getToolContext(experimental_context);
          const { walletAddress, privateKey } = getWalletConfig();
          const resolvedToken = await resolveTokenRefOrThrow(token, {
            walletAddress,
          });

          const quote = await getTransferQuote({
            walletAddress,
            tokenId: resolvedToken.intentsTokenId,
            amount,
            decimals: resolvedToken.decimals,
            toAddress,
          });

          if (quote.status === "error") {
            return {
              kind: "action-result",
              ok: false,
              message: quote.message,
            };
          }

          const approvalId = createApprovalId("transfer");
          const approvalResponse = await waitForApproval({
            userId: walletAddress,
            id: approvalId,
            context: {
              autoApprove: false,
              telegramUserId: context.telegramUserId,
              botApi: context.botApi,
            },
            approvalData: {
              kind: "transfer",
              amount: quote.amountFormatted,
              tokenSymbol: resolvedToken.symbol,
              toAddress: quote.toAddress,
              chain: resolvedToken.blockchain,
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

          const result = await executeTransfer({
            privateKey,
            tokenId: quote.tokenId,
            amount: quote.amount,
            toAddress: quote.toAddress,
          });

          if (result.status !== "success") {
            return {
              kind: "action-result",
              ok: false,
              message: result.message ?? "Transfer failed",
            };
          }

          return {
            kind: "action-result",
            ok: true,
            message: "Transfer submitted successfully",
            data: result,
          };
        } catch (error) {
          console.error("executeTransfer failed:", error);
          return {
            kind: "action-result",
            ok: false,
            message: stringify(
              error instanceof Error ? error.message : "Transfer failed"
            ),
          };
        }
      },
    }),
  };
};
