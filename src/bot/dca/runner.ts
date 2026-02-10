import { Api } from "grammy";
import { loadConfig } from "@/config";
import { executeSwapQuote, getSwapQuote } from "@/services/swap";
import { executeWithdrawQuote, getWithdrawQuote } from "@/services/withdraw";
import { getSupportedTokens } from "@/services/tokens";
import { DcaRule } from "./store";

function buildRunId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function runDca(rule: DcaRule, api: Api): Promise<void> {
  const runId = buildRunId();
  rule.lastRunAt = Date.now();

  await api.sendMessage(
    rule.userId,
    `⏱️ DCA run started (${runId})\n${rule.fromSymbol} → ${rule.toSymbol} ${rule.amount}`,
    { parse_mode: "Markdown" }
  );

  try {
    const tokens = await getSupportedTokens();
    const fromToken = tokens.find(
      (token) => token.intentsTokenId === rule.fromTokenId
    );
    const toToken = tokens.find(
      (token) => token.intentsTokenId === rule.toTokenId
    );

    if (!fromToken || !toToken) {
      await api.sendMessage(
        rule.userId,
        `❌ DCA run failed (${runId}): Token not found or no longer supported.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const { walletAddress, privateKey } = loadConfig();

    const quoteResult = await getSwapQuote({
      walletAddress,
      fromTokenId: fromToken.intentsTokenId,
      toTokenId: toToken.intentsTokenId,
      amount: rule.amount,
    });

    if (quoteResult.status === "error") {
      await api.sendMessage(
        rule.userId,
        `❌ DCA run failed (${runId}): ${quoteResult.message}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (rule.dryRun) {
      await api.sendMessage(
        rule.userId,
        `✅ DCA dry-run (${runId})\n` +
          `${quoteResult.amountInFormatted} ${fromToken.symbol} → ${quoteResult.amountOutFormatted} ${toToken.symbol}\n` +
          `Rate: ${quoteResult.exchangeRate}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const swapResult = await executeSwapQuote({
      privateKey,
      walletAddress,
      quote: quoteResult.quote,
    });

    if (swapResult.status !== "success") {
      await api.sendMessage(
        rule.userId,
        `❌ DCA swap failed (${runId}): ${swapResult.message ?? "Swap failed."}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await api.sendMessage(
      rule.userId,
      `✅ DCA swap executed (${runId})\n` +
        `${quoteResult.amountInFormatted} ${fromToken.symbol} → ${quoteResult.amountOutFormatted} ${toToken.symbol}\n` +
        `Tx: ${swapResult.explorerLink}`,
      { parse_mode: "Markdown" }
    );

    if (!rule.withdraw?.enabled) {
      return;
    }

    const withdrawQuote = await getWithdrawQuote({
      walletAddress,
      destinationAddress: rule.withdraw.address,
      assetId: toToken.intentsTokenId,
      amount: quoteResult.amountOutFormatted,
      decimals: toToken.decimals,
    });

    if (withdrawQuote.status === "error") {
      await api.sendMessage(
        rule.userId,
        `⚠️ Withdraw failed (${runId}): ${withdrawQuote.message}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const withdrawResult = await executeWithdrawQuote({
      privateKey,
      walletAddress,
      quote: withdrawQuote.quote,
    });

    if (withdrawResult.status !== "success") {
      await api.sendMessage(
        rule.userId,
        `⚠️ Withdraw failed (${runId}): ${withdrawResult.message ?? "Withdrawal failed."}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await api.sendMessage(
      rule.userId,
      `✅ Withdraw completed (${runId})\n` +
        `${withdrawQuote.amountFormatted} ${toToken.symbol} → ${rule.withdraw.address}\n` +
        `Tx: ${withdrawResult.explorerLink}`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error running DCA:", error);
    await api.sendMessage(
      rule.userId,
      `❌ DCA run failed (${runId}): unexpected error.`,
      { parse_mode: "Markdown" }
    );
  }
}
