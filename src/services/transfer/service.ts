import { KeyPairString } from "@/types/near";
import {
  createInternalTransferRoute,
  RouteEnum,
} from "@defuse-protocol/intents-sdk";
import { authIdentity, AuthMethod } from "@defuse-protocol/internal-utils";
import { formatUnits, parseUnits } from "viem";
import { batchBalanceOf } from "../balance/batch";
import { getNearIntentsSDK } from "../near-intents/sdk";
import { getSupportedTokens } from "../tokens";
import type { TransferQuoteResult, TransferSubmitResponse } from "./schema";

export async function getTransferQuote({
  walletAddress,
  tokenId,
  amount,
  decimals,
  toAddress,
}: {
  walletAddress: string;
  tokenId: string;
  amount: string;
  decimals: number;
  toAddress: string;
}): Promise<TransferQuoteResult> {
  const accountId = authIdentity.authHandleToIntentsUserId(
    walletAddress,
    AuthMethod.Near
  );

  const balances = await batchBalanceOf({
    accountId,
    tokenIds: [tokenId],
  });

  const balanceRaw = balances[0] ?? "0";
  const balance = BigInt(balanceRaw);
  const amountInBaseUnits = parseUnits(amount, decimals);

  if (balance < amountInBaseUnits) {
    const supportedTokens = await getSupportedTokens();
    const token = supportedTokens.find((t) => t.intentsTokenId === tokenId);
    const balanceFormatted = formatUnits(balance, decimals);
    const symbol = token?.symbol ?? tokenId;

    return {
      status: "error" as const,
      message: `Insufficient balance. Available: ${balanceFormatted} ${symbol}`,
    };
  }

  return {
    status: "success" as const,
    tokenId,
    amount: amountInBaseUnits.toString(),
    amountFormatted: amount,
    toAddress,
  };
}

export async function executeTransfer({
  privateKey,
  tokenId,
  amount,
  toAddress,
}: {
  privateKey: KeyPairString;
  tokenId: string;
  amount: string;
  toAddress: string;
}): Promise<TransferSubmitResponse> {
  const result = await transferToken({
    privateKey,
    tokenId,
    amount,
    toAddress,
  });

  return {
    status: "success" as const,
    txHash: result.txHash,
    explorerLink: `https://nearblocks.io/txns/${result.txHash}`,
  };
}

export async function transferToken({
  privateKey,
  tokenId,
  amount,
  toAddress,
}: {
  privateKey: KeyPairString;
  tokenId: string;
  amount: string;
  toAddress: string;
}): Promise<{ txHash: string }> {
  const sdk = await getNearIntentsSDK({ privateKey });
  const withdrawalIntents = await sdk.createWithdrawalIntents({
    withdrawalParams: {
      assetId: tokenId,
      amount: BigInt(amount),
      destinationAddress: toAddress,
      // Destination memo is only used for XRP Ledger withdrawals
      destinationMemo: undefined,
      feeInclusive: false,
      routeConfig: createInternalTransferRoute(),
    },
    feeEstimation: {
      amount: 0n,
      quote: null,
      underlyingFees: {
        [RouteEnum.InternalTransfer]: null,
      },
    },
  });

  const { intentHash } = await sdk.signAndSendIntent({
    intents: withdrawalIntents,
  });

  const { hash } = await sdk.waitForIntentSettlement({ intentHash });
  return {
    txHash: hash,
  };
}
