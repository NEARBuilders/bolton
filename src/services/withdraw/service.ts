import { AuthMethod, authIdentity } from "@defuse-protocol/internal-utils";
import {
  QuoteRequest,
  type QuoteResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import { KeyPair } from "near-api-js";
import { formatUnits, parseUnits } from "viem";
import type { KeyPairString } from "@/types/near";
import { batchBalanceOf } from "../balance/batch";
import { getOneClickQuote, submitOneClickQuote } from "../oneclick/index";
import { getSupportedTokens } from "../tokens";
import type {
  WithdrawQuoteResultInternal,
  WithdrawSubmitResponse,
} from "./schema";

function getQuoteExpiresAt(quote: QuoteResponse): number {
  const deadline = quote.quote.deadline;
  const parsedDeadline = deadline ? Date.parse(deadline) : Number.NaN;

  if (Number.isFinite(parsedDeadline)) {
    return parsedDeadline;
  }

  return Date.now() + 20 * 60 * 1000;
}

export async function getWithdrawQuote({
  walletAddress,
  destinationAddress,
  assetId,
  amount,
  decimals,
}: {
  walletAddress: string;
  destinationAddress: string;
  assetId: string;
  amount: string;
  decimals: number;
}): Promise<WithdrawQuoteResultInternal> {
  const accountId = authIdentity.authHandleToIntentsUserId(
    walletAddress,
    AuthMethod.Near
  );

  const balances = await batchBalanceOf({
    accountId,
    tokenIds: [assetId],
  });

  const balanceRaw = balances[0] ?? "0";
  const balance = BigInt(balanceRaw);
  const amountInBaseUnits = parseUnits(amount, decimals);

  if (balance < amountInBaseUnits) {
    const supportedTokens = await getSupportedTokens();
    const token = supportedTokens.find((t) => t.intentsTokenId === assetId);
    const balanceFormatted = formatUnits(balance, decimals);
    const symbol = token?.symbol ?? assetId;

    return {
      status: "error" as const,
      message: `Insufficient balance. Available: ${balanceFormatted} ${symbol}`,
    };
  }

  const quote = await getOneClickQuote({
    originAsset: assetId,
    destinationAsset: assetId,
    amount: amountInBaseUnits.toString(),
    toWalletAddress: destinationAddress,
    fromWalletAddress: walletAddress,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  });

  const transferFee =
    BigInt(quote.quote.amountIn) - BigInt(quote.quote.amountOut);

  return {
    status: "success" as const,
    quoteId: quote.correlationId,
    quote,
    assetId,
    amount: amountInBaseUnits.toString(),
    amountFormatted: amount,
    destinationAddress,
    receivedAmount: quote.quote.amountOut,
    receivedAmountFormatted: formatUnits(
      BigInt(quote.quote.amountOut),
      decimals
    ),
    transferFee: transferFee.toString(),
    transferFeeFormatted: formatUnits(transferFee, decimals),
    expiresAt: getQuoteExpiresAt(quote),
  };
}

export async function executeWithdrawQuote({
  privateKey,
  walletAddress,
  quote,
}: {
  privateKey: KeyPairString;
  walletAddress: string;
  quote: QuoteResponse;
}): Promise<WithdrawSubmitResponse> {
  const wallet = KeyPair.fromString(privateKey);

  const { txHash } = await submitOneClickQuote({
    quote,
    wallet,
    walletAddress,
  });

  return {
    status: "success" as const,
    txHash,
    explorerLink: `https://nearblocks.io/txns/${txHash}`,
  };
}
