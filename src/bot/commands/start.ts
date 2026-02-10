import { Context } from "grammy";

export async function handleStart(ctx: Context): Promise<void> {
  const startText = `👋 *Welcome to Bolton*

Bolton is your AI-first NEAR Intents assistant on Telegram.
Ask naturally, for example:
• "swap 10 USDC to ETH"
• "send 5 NEAR to alice.near"
• "show my balances"

Use */help* to see all commands.`;

  await ctx.reply(startText, {
    parse_mode: "Markdown",
    reply_markup: { remove_keyboard: true },
  });
}
