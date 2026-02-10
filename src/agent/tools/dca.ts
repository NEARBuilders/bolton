import {
  ActionToolProgress,
  ActionToolResult,
  ViewToolResult,
  amountSchema,
  cronSchema,
  tokenRefSchema,
} from "@/agent/types";
import {
  ApproveToolStatus,
  createApprovalId,
  waitForApproval,
} from "@/bot/ai/approval";
import { runDca } from "@/bot/dca/runner";
import { dcaScheduler } from "@/bot/dca/scheduler";
import { dcaStore } from "@/bot/dca/store";
import { getSwapQuote } from "@/services/swap";
import { tool } from "ai";
import type { Api } from "grammy";
import { stringify } from "viem";
import z from "zod";
import {
  getToolContext,
  getWalletConfig,
  resolveTokenRefOrThrow,
} from "./shared";

function getApprovalFailureMessage(
  status: ApproveToolStatus,
  action: "create" | "stop"
): string | null {
  if (status === ApproveToolStatus.REJECTED) {
    return action === "create"
      ? "DCA rule creation cancelled by user"
      : "DCA rule stop cancelled by user";
  }
  if (status === ApproveToolStatus.TIMEOUT) {
    return action === "create"
      ? "DCA rule creation approval timeout"
      : "DCA rule stop approval timeout";
  }
  return null;
}

export const getDcaTools = () => {
  return {
    getDcaRules: tool({
      description: "Get all DCA rules for the current Telegram user",
      inputSchema: z.object({}),
      execute: async (_, { experimental_context }): Promise<ViewToolResult> => {
        try {
          const context = getToolContext(experimental_context);
          if (!context.telegramUserId) {
            return {
              kind: "view",
              ok: false,
              message: "Unable to identify Telegram user for DCA rules",
            };
          }

          const rules = dcaStore.list(context.telegramUserId);

          return {
            kind: "view",
            ok: true,
            message: `Found ${rules.length} DCA rules`,
            data: { rules },
          };
        } catch (error) {
          console.error("getDcaRules failed:", error);
          return {
            kind: "view",
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to get DCA rules",
          };
        }
      },
    }),

    createDcaRule: tool({
      description: "Create and schedule a DCA rule",
      inputSchema: z.object({
        fromToken: tokenRefSchema,
        toToken: tokenRefSchema,
        amount: amountSchema,
        cron: cronSchema,
        dryRun: z.boolean().optional(),
      }),
      async execute(
        { fromToken, toToken, amount, cron, dryRun },
        { experimental_context }
      ): Promise<ActionToolProgress | ActionToolResult> {
        try {
          const context = getToolContext(experimental_context);
          if (!context.telegramUserId || !context.botApi) {
            return {
              kind: "action-result",
              ok: false,
              message: "Cannot create DCA rule without Telegram context",
            };
          }

          const { walletAddress } = getWalletConfig();
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

          const approvalId = createApprovalId("dca");
          const approvalResponse = await waitForApproval({
            userId: walletAddress,
            id: approvalId,
            context: {
              autoApprove: false,
              telegramUserId: context.telegramUserId,
              botApi: context.botApi,
            },
            approvalData: {
              kind: "dca",
              action: "create",
              fromAmount: quote.amountInFormatted,
              fromTokenSymbol: resolvedFrom.symbol,
              toAmount: quote.amountOutFormatted,
              toTokenSymbol: resolvedTo.symbol,
              fromChain: resolvedFrom.blockchain,
              toChain: resolvedTo.blockchain,
              cron,
            },
          });

          const approvalFailureMessage = getApprovalFailureMessage(
            approvalResponse.status,
            "create"
          );
          if (approvalFailureMessage) {
            return {
              kind: "action-result",
              ok: false,
              message: approvalFailureMessage,
            };
          }

          const rule = dcaStore.add({
            userId: context.telegramUserId,
            fromTokenId: resolvedFrom.intentsTokenId,
            toTokenId: resolvedTo.intentsTokenId,
            fromSymbol: resolvedFrom.symbol,
            toSymbol: resolvedTo.symbol,
            amount,
            cron,
            fromChain: resolvedFrom.blockchain,
            toChain: resolvedTo.blockchain,
            dryRun,
          });

          dcaScheduler.schedule(rule, (scheduledRule) => {
            void runDca(scheduledRule, context.botApi as Api);
          });

          return {
            kind: "action-result",
            ok: true,
            message: `DCA rule created: ${rule.id}`,
            data: { rule },
          };
        } catch (error) {
          console.error("createDcaRule failed:", error);
          return {
            kind: "action-result",
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to create DCA rule",
          };
        }
      },
    }),

    stopDcaRule: tool({
      description: "Stop and remove a DCA rule by rule id",
      inputSchema: z.object({
        ruleId: z.string().min(1),
      }),
      async execute(
        { ruleId },
        { experimental_context }
      ): Promise<ActionToolProgress | ActionToolResult> {
        try {
          const context = getToolContext(experimental_context);
          if (!context.telegramUserId) {
            return {
              kind: "action-result",
              ok: false,
              message: "Cannot stop DCA rule without Telegram context",
            };
          }

          const rule = dcaStore.get(ruleId);
          if (!rule || rule.userId !== context.telegramUserId) {
            return {
              kind: "action-result",
              ok: false,
              message: `DCA rule not found: ${ruleId}`,
            };
          }

          const approvalId = createApprovalId("dca");
          const approvalResponse = await waitForApproval({
            userId: String(rule.userId),
            id: approvalId,
            context: {
              autoApprove: false,
              telegramUserId: context.telegramUserId,
              botApi: context.botApi,
            },
            approvalData: {
              kind: "dca",
              action: "stop",
              ruleId,
            },
          });

          const approvalFailureMessage = getApprovalFailureMessage(
            approvalResponse.status,
            "stop"
          );
          if (approvalFailureMessage) {
            return {
              kind: "action-result",
              ok: false,
              message: approvalFailureMessage,
            };
          }

          dcaScheduler.cancel(ruleId);
          const removed = dcaStore.remove(context.telegramUserId, ruleId);

          return {
            kind: "action-result",
            ok: removed,
            message: removed
              ? `DCA rule stopped: ${ruleId}`
              : `Failed to stop DCA rule: ${ruleId}`,
            data: { ruleId },
          };
        } catch (error) {
          console.error("stopDcaRule failed:", error);
          return {
            kind: "action-result",
            ok: false,
            message: stringify(
              error instanceof Error ? error.message : "Failed to stop DCA rule"
            ),
          };
        }
      },
    }),
  };
};
