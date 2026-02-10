export function errorMessage(
  title: string,
  message: string,
  errorCode?: string
): string {
  let text = `❌ *${title}*\n\n${message}`;

  if (errorCode) {
    text += `\n\n🔧 Error code: \`${errorCode}\``;
  }

  return text;
}

export function successMessage(title: string, message: string): string {
  return `✅ *${title}*\n\n${message}`;
}

export function pendingMessage(title: string, message: string): string {
  return `⏳ *${title}*\n\n${message}`;
}

export function infoMessage(title: string, message: string): string {
  return `ℹ️ *${title}*\n\n${message}`;
}

export function swapQuoteMessage(
  fromToken: string,
  fromAmount: string,
  fromUsd: string,
  toToken: string,
  toAmount: string,
  toUsd: string,
  rate: string,
  slippage: string,
  validity: string
): string {
  return (
    `🔄 *Swap Quote*\n\n` +
    `From: *${fromAmount} ${fromToken}* (${fromUsd})\n` +
    `To: *${toAmount} ${toToken}* (${toUsd})\n\n` +
    `Rate: 1 ${fromToken} = ${rate} ${toToken}\n` +
    `Slippage: ${slippage}%\n\n` +
    `💡 Quote valid for: ${validity}`
  );
}

export function withdrawalQuoteMessage(
  token: string,
  amount: string,
  usdValue: string,
  address: string,
  networkFee: string,
  protocolFee: string,
  receiveAmount: string
): string {
  return (
    `💸 *Withdrawal Quote*\n\n` +
    `Amount: *${amount} ${token}* (${usdValue})\n` +
    `To: \`${address}\`\n\n` +
    `Network Fee: ${networkFee}\n` +
    `Protocol Fee: ${protocolFee}\n` +
    `💰 You will receive: *${receiveAmount} ${token}*`
  );
}

export function depositMessage(
  token: string,
  network: string,
  address: string,
  minAmount: string,
  minUsd: string
): string {
  const text =
    `💰 *Deposit ${token}*\n\n` +
    `Network: *${network}*\n` +
    `Address: \`${address}\`\n\n` +
    `Minimum Deposit: ${minAmount} ${token} (${minUsd})\n` +
    `⚠️ Only send ${token} on ${network} to this address.\n` +
    `Sending other assets may result in loss of funds.`;
  return text;
}

export function balanceMessage(
  tokenName: string,
  tokenIcon: string,
  balance: string,
  balanceUsd: string,
  price: string,
  change24h: string
): string {
  const changeSign = parseFloat(change24h) >= 0 ? "🟢" : "🔴";
  return (
    `${tokenIcon} *${tokenName}*\n` +
    `   ${balance} (${balanceUsd})\n` +
    `   Price: ${price} | 24h: ${changeSign}${change24h}`
  );
}

export function portfolioSummary(
  totalValue: string,
  change24h: string
): string {
  const changeSign = parseFloat(change24h) >= 0 ? "📈" : "📉";
  return (
    `💼 *Your Portfolio*\n\n` +
    `Total Value: *${totalValue}*\n` +
    `24h Change: ${changeSign} ${change24h}`
  );
}
