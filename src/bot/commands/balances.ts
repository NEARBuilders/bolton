import { Context } from "grammy";
import { loadConfig } from "@/config";
import { getTokenBalances } from "@/services/balance";
import { formatNearAmount, formatUsdAmount } from "../utils/formatters";
import { balanceMessage, portfolioSummary } from "../utils/messages";

export async function handleBalances(
  ctx: Context,
  options: { forceRefresh?: boolean } = {}
): Promise<void> {
  await ctx.reply("Loading balances...", {
    reply_markup: { remove_keyboard: true },
  });

  try {
    const { walletAddress } = loadConfig();

    const balances = await getTokenBalances({
      walletAddress,
      forceRefresh: options?.forceRefresh,
    });

    if (balances.length === 0) {
      await ctx.reply(
        `💼 *Your Portfolio*\n\n` +
          `Total Value: $0.00\n\n` +
          `You don't have any token balances yet.`,
        {
          parse_mode: "Markdown",
        }
      );
      return;
    }

    let totalValue = 0;
    balances.forEach((balance) => {
      const price = parseFloat(balance.priceUSD);
      const balanceValue = parseFloat(balance.balanceFormatted) * price;
      totalValue += balanceValue;
    });

    const totalValueDisplay = formatUsdAmount(totalValue);

    const balanceList = balances
      .map((balance) => {
        const price = parseFloat(balance.priceUSD);
        const balanceValue = parseFloat(balance.balanceFormatted) * price;
        const balanceUsd = formatUsdAmount(balanceValue);
        const priceDisplay = formatUsdAmount(price);
        const change24h = "0.00"; // Placeholder - would need to fetch from API

        return balanceMessage(
          balance.symbol,
          getTokenIcon(balance.symbol),
          formatNearAmount(balance.balanceFormatted),
          balanceUsd,
          priceDisplay,
          change24h
        );
      })
      .join("\n\n═══════════════════════════════\n\n");

    await ctx.reply(
      `${portfolioSummary(totalValueDisplay, "0.00")}\n\n` +
        `═══════════════════════════════\n\n` +
        balanceList,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Error fetching balances:", error);
    await ctx.reply("Error loading balances. Please try again.");
  }
}

function getTokenIcon(symbol: string): string {
  const icons: Record<string, string> = {
    NEAR: "🪙",
    USDT: "💵",
    USDC: "💵",
    ETH: "Ξ",
    WETH: "Ξ",
    BTC: "₿",
    DAI: "◈",
    wNEAR: "🪙",
  };
  return icons[symbol] || "🪙";
}
