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
import { executeWithdrawQuote, getWithdrawQuote } from "@/services/withdraw";
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
    return "Withdrawal cancelled by user";
  }
  if (status === ApproveToolStatus.TIMEOUT) {
    return "Withdrawal approval timeout";
  }
  return null;
}

export const getWithdrawTools = () => {
  return {
    executeWithdraw: tool({
      description: "Execute a withdrawal transaction",
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

          const quote = await getWithdrawQuote({
            walletAddress,
            destinationAddress: toAddress,
            assetId: resolvedToken.intentsTokenId,
            amount,
            decimals: resolvedToken.decimals,
          });

          if (quote.status === "error") {
            return {
              kind: "action-result",
              ok: false,
              message: quote.message,
            };
          }

          const approvalId = createApprovalId("withdraw");
          const approvalResponse = await waitForApproval({
            userId: walletAddress,
            id: approvalId,
            context: {
              autoApprove: false,
              telegramUserId: context.telegramUserId,
              botApi: context.botApi,
            },
            approvalData: {
              kind: "withdraw",
              amount: quote.amountFormatted,
              tokenSymbol: resolvedToken.symbol,
              toAddress: quote.destinationAddress,
              chain: resolvedToken.blockchain,
              receiveAmount: quote.receivedAmountFormatted,
              feeAmount: quote.transferFeeFormatted,
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

          const result = await executeWithdrawQuote({
            privateKey,
            walletAddress,
            quote: quote.quote,
          });

          if (result.status !== "success") {
            return {
              kind: "action-result",
              ok: false,
              message: result.message ?? "Withdrawal failed",
            };
          }

          return {
            kind: "action-result",
            ok: true,
            message: "Withdrawal submitted successfully",
            data: result,
          };
        } catch (error) {
          console.error("executeWithdraw failed:", error);
          return {
            kind: "action-result",
            ok: false,
            message:
              stringify(
                error instanceof Error ? error.message : "Withdrawal failed"
              ),
          };
        }
      },
    }),
  };
};
