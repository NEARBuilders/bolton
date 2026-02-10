import { Context } from "grammy";

export async function handleHelp(ctx: Context): Promise<void> {
  const helpText = `📖 *Bolton — Help*

Use Bolton as an AI-first assistant. Ask naturally, for example:
• "swap 10 USDC to ETH"
• "send 5 NEAR to alice.near"
• "show my balances"

Available commands:
• */start* — welcome and quickstart guide
• */new* — start a new chat and reset AI context
• */balances* — show your wallet balances
• */help* — show this help message`;

  await ctx.reply(helpText, {
    parse_mode: "Markdown",
    reply_markup: { remove_keyboard: true },
  });
}
