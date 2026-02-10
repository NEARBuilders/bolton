import "dotenv/config";

import { Bot, type BotError, type Context } from "grammy";

import { handleAiApprovalCallback, handleAiText } from "./bot/ai/router.js";
import { handleBalances } from "./bot/commands/balances.js";
import { handleHelp } from "./bot/commands/help.js";
import { handleNew } from "./bot/commands/new.js";
import { handleStart } from "./bot/commands/start.js";
import { createAllowlistMiddleware } from "./bot/middleware/allowlist.js";
import { createRateLimitMiddleware } from "./bot/middleware/rate-limit.js";
import { env } from "./config.js";
import { configureOneClickAPI } from "./services/oneclick/index.js";

configureOneClickAPI(
  env.DEFUSE_JWT_TOKEN ? { token: env.DEFUSE_JWT_TOKEN } : undefined
);

const bot = new Bot<Context>(env.BOT_TOKEN);

bot.use(createAllowlistMiddleware());
bot.use(createRateLimitMiddleware());

void bot.api
  .setMyCommands([
    { command: "start", description: "Welcome and quickstart" },
    { command: "new", description: "New chat" },
    { command: "balances", description: "Show balances" },
    { command: "help", description: "Help for Bolton" },
  ])
  .catch((error) => {
    console.error("Failed to set Telegram commands:", error);
  });

bot.command("start", handleStart);
bot.command("new", handleNew);
bot.command("help", handleHelp);
bot.command("balances", (ctx) => handleBalances(ctx, { forceRefresh: true }));

bot.on("callback_query:data", async (ctx) => {
  const aiHandled = await handleAiApprovalCallback(ctx, ctx.callbackQuery.data);
  if (aiHandled) return;
  await ctx.answerCallbackQuery({
    text: "This action is no longer supported. Use /help.",
    show_alert: false,
  });
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.trim().startsWith("/")) return;

  const aiHandled = await handleAiText(ctx);
  if (aiHandled) return;

  await ctx.reply(
    "I didn't understand that command. Use /help to see available commands.",
    { reply_markup: { remove_keyboard: true } }
  );
});

bot.catch(handleBotError);
bot.start();

console.log("Bolton started!");

function handleBotError(err: BotError<Context>): void {
  console.error("Bot error:", err.error);

  const errorMessages: Record<string, string> = {
    INSUFFICIENT_BALANCE: "Insufficient balance. You have {BALANCE} {TOKEN}",
    INVALID_ADDRESS: "Invalid address format for {BLOCKCHAIN}",
    QUOTE_EXPIRED: "Quote expired. Fetching new rates...",
    NETWORK_ERROR: "Network issue. Retrying...",
    TRANSACTION_FAILED: "Transaction failed. See details",
    AUTH_REQUIRED: "Authentication is not configured for this bot.",
    SESSION_EXPIRED: "Session handling is disabled.",
  };

  const errorCode =
    (err.error as { code?: string } | undefined)?.code || "UNKNOWN";
  const message =
    errorMessages[errorCode] || "An error occurred. Please try again.";
  const errorId = Math.random().toString(36).substring(2, 8).toUpperCase();

  err.ctx.reply(`Error: ${errorCode}\n\n${message}\n\nError ID: ${errorId}`, {
    reply_markup: { remove_keyboard: true },
  });
}
