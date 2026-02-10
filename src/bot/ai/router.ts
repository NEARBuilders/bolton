import { runAgentTurn } from "@/agent";
import { buildFinalApprovalMessage } from "@/bot/utils/approval";
import type { ModelMessage } from "ai";
import type { Context } from "grammy";
import { ApproveToolStatus, approveTool, getPendingApproval } from "./approval";
import { parseApprovalCallback } from "./approval-callback";
import { appendAiMessages, createSessionWithUserMessage } from "./store";

const TYPING_INTERVAL_MS = 4_000;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function markdownToTelegramHtml(markdown: string): string {
  const codeBlocks: string[] = [];
  let text = markdown.replace(/```([\s\S]*?)```/g, (_match, code: string) => {
    const idx =
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`) - 1;
    return `@@CODE_BLOCK_${idx}@@`;
  });

  text = escapeHtml(text);

  text = text
    .replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<i>$2</i>")
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<i>$2</i>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  text = text.replace(
    /@@CODE_BLOCK_(\d+)@@/g,
    (_m, idx: string) => codeBlocks[Number(idx)] ?? ""
  );
  return text;
}

const TELEGRAM_MSG_LIMIT = 4096;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 4) + "\n...";
}

async function sendReply(ctx: Context, text: string) {
  const htmlText = truncate(markdownToTelegramHtml(text), TELEGRAM_MSG_LIMIT);

  try {
    return await ctx.reply(htmlText, {
      parse_mode: "HTML" as const,
    });
  } catch (error) {
    console.warn(
      "Failed to send rich reply, falling back to plain text:",
      error
    );
  }
  return await ctx.reply(truncate(text, TELEGRAM_MSG_LIMIT));
}

function toApprovalStatus(action: "confirm" | "reject"): ApproveToolStatus {
  if (action === "confirm") {
    return ApproveToolStatus.APPROVED;
  }
  return ApproveToolStatus.REJECTED;
}

function toApprovalAckMessage(status: ApproveToolStatus): string {
  if (status === ApproveToolStatus.APPROVED) {
    return "Transaction approved";
  }
  return "Transaction rejected";
}

async function withTyping<T>(
  ctx: Context,
  chatId: number,
  action: () => Promise<T>
): Promise<T> {
  const sendTyping = async () => {
    try {
      await ctx.api.sendChatAction(chatId, "typing");
    } catch {
      // ignore transient telegram chat action errors
    }
  };

  await sendTyping();
  const timer = setInterval(() => {
    void sendTyping();
  }, TYPING_INTERVAL_MS);

  try {
    return await action();
  } finally {
    clearInterval(timer);
  }
}

async function sendAgentResponse(
  ctx: Context,
  result: Awaited<ReturnType<typeof runAgentTurn>>
): Promise<void> {
  const replyText = result.text.trim();
  if (!replyText.trim()) return;

  await sendReply(ctx, replyText);
}

export async function handleAiApprovalCallback(
  ctx: Context,
  data: string
): Promise<boolean> {
  const parsed = parseApprovalCallback(data);
  if (!parsed) return false;

  const telegramUserId = ctx.from?.id;
  if (!telegramUserId) {
    await ctx.answerCallbackQuery({
      text: "Unable to identify user for this approval",
      show_alert: true,
    });
    return true;
  }

  const pending = getPendingApproval({ id: parsed.approvalId });
  if (!pending) {
    await ctx.answerCallbackQuery({
      text: "This approval request has expired or was already handled",
      show_alert: true,
    });
    return true;
  }

  const status = toApprovalStatus(parsed.action);
  const isApproved = status === ApproveToolStatus.APPROVED;

  const approvalResult = approveTool({
    id: parsed.approvalId,
    status,
    telegramUserId,
  });

  if (!approvalResult.ok) {
    const message =
      approvalResult.reason === "unauthorized"
        ? "You are not allowed to approve this action"
        : "This approval request has expired or was already handled";

    await ctx.answerCallbackQuery({
      text: message,
      show_alert: true,
    });
    return true;
  }

  await ctx.answerCallbackQuery({
    text: toApprovalAckMessage(status),
  });

  const finalApprovalMessage = buildFinalApprovalMessage(
    isApproved,
    pending.approvalData
  );

  try {
    await ctx.editMessageText(finalApprovalMessage);
  } catch (error) {
    console.warn("Failed to edit approval message, sending fallback:", error);
    try {
      await ctx.reply(finalApprovalMessage);
    } catch (fallbackError) {
      console.error("Failed to send approval fallback message:", fallbackError);
    }
  }

  return true;
}

export async function handleAiText(ctx: Context): Promise<boolean> {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith("/")) return false;

  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!userId || !chatId) {
    return false;
  }

  void (async () => {
    try {
      const session = await createSessionWithUserMessage(userId, text);
      const result = await withTyping(ctx, chatId, async () =>
        runAgentTurn({
          messages: session.messages,
          context: {
            telegramUserId: userId,
            chatId,
            botApi: ctx.api,
          },
        })
      );
      await appendAiMessages(
        userId,
        result.response.messages as ModelMessage[]
      );
      await sendAgentResponse(ctx, result);
    } catch (error) {
      console.error("AI router failed:", error);
      try {
        await ctx.reply("Failed to process your request. Please try again.");
      } catch {
        // ignore send errors
      }
    }
  })();

  return true;
}
