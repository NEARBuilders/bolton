export function formatNearAmount(amount: string | number): string {
  const nearAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (nearAmount >= 1) {
    return nearAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  } else {
    return nearAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }
}

export function formatUsdAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.ceil(seconds / 3600)}h`;
  } else {
    return `${Math.ceil(seconds / 86400)}d`;
  }
}
