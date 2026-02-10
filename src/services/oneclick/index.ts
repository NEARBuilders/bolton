import { getApiKey } from "@/config";
import { SLIPPAGE_TOLERANCE } from "@/config/slippage";
import { createTransferMessage } from "@/utils/intent-message.js";
import { convertPublishIntentToLegacyFormat } from "@/utils/parseFailedPublishError";
import {
  AuthMethod,
  authIdentity,
  solverRelay,
} from "@defuse-protocol/internal-utils";
import {
  OneClickService,
  OpenAPI,
  QuoteRequest,
  type QuoteResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import { base64 } from "@scure/base";
import { type KeyPair, KeyPairSigner } from "near-api-js";
import { getNearIntentsSDK } from "../near-intents/sdk";

// Lazy initialization flag
let isConfigured = false;

/**
 * Configure the OneClick API with custom settings.
 * Call this before using any OneClick functions if you need custom configuration.
 * If not called, defaults will be used automatically on first API call.
 *
 * API key priority: explicit token param > config file > env var
 */
export function configureOneClickAPI(options?: {
  baseUrl?: string;
  token?: string;
}): void {
  OpenAPI.BASE = options?.baseUrl ?? "https://1click.chaindefuser.com";
  OpenAPI.TOKEN = options?.token ?? getApiKey();
  isConfigured = true;
}

// Ensure API is configured before use (lazy init)
function ensureConfigured(): void {
  if (!isConfigured) {
    configureOneClickAPI();
  }
}

export const getOneClickQuote = async ({
  originAsset,
  destinationAsset,
  amount,
  toWalletAddress,
  fromWalletAddress,
  recipientType = QuoteRequest.recipientType.INTENTS,
}: {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  toWalletAddress: string;
  fromWalletAddress: string;
  recipientType?: QuoteRequest.recipientType;
}) => {
  ensureConfigured();
  const deadline = new Date();
  deadline.setSeconds(deadline.getSeconds() + 60 * 20);

  return await OneClickService.getQuote({
    deadline: deadline.toISOString(),
    recipient: toWalletAddress,
    recipientType,
    refundTo: fromWalletAddress,
    refundType: QuoteRequest.refundType.INTENTS,

    depositType: QuoteRequest.depositType.INTENTS,
    dry: false,
    slippageTolerance: SLIPPAGE_TOLERANCE,

    swapType: QuoteRequest.swapType.EXACT_INPUT,
    originAsset,
    destinationAsset,
    amount,
  });
};

export const submitOneClickQuote = async ({
  quote,
  wallet,
  walletAddress,
}: {
  quote: QuoteResponse;
  wallet: KeyPair;
  walletAddress: string;
}) => {
  ensureConfigured();
  try {
    const sdk = await getNearIntentsSDK({ privateKey: wallet.toString() });
    const { nonce, deadline } = await sdk
      .intentBuilder()
      .setDeadline(new Date(quote.quote.deadline ?? ""))
      .build();

    const tokenInAssetId = quote.quoteRequest.originAsset;
    const signerId = authIdentity.authHandleToIntentsUserId(
      walletAddress,
      AuthMethod.Near
    );
    const walletMessage = createTransferMessage(
      [[tokenInAssetId, BigInt(quote.quoteRequest.amount)]], // tokenDeltas
      {
        signerId,
        receiverId: quote.quote.depositAddress as string, // receiver (deposit address from 1CS)
        deadlineTimestamp: Date.parse(deadline),
        nonce: base64.decode(nonce),
      }
    );

    const signer = new KeyPairSigner(wallet);

    const signature = await signer.signNep413Message(
      walletMessage.NEP413.message,
      walletAddress,
      walletMessage.NEP413.recipient,
      walletMessage.NEP413.nonce
    );

    const publishResult = await solverRelay
      .publishIntent(
        {
          type: "NEP413",
          signatureData: {
            accountId: signature.accountId,
            publicKey: wallet.getPublicKey().toString(),
            signature: base64.encode(signature.signature),
          },
          signedData: walletMessage.NEP413,
        },
        { userAddress: walletAddress, userChainType: AuthMethod.Near },
        []
      )
      .then(convertPublishIntentToLegacyFormat);

    if (publishResult.tag === "err") {
      throw new Error(publishResult.value.reason);
    }

    const { hash } = await sdk.waitForIntentSettlement({
      intentHash: publishResult.value,
    });

    const depositResponse = await OneClickService.submitDepositTx({
      txHash: hash,
      depositAddress: quote.quote.depositAddress as string,
    });
    return {
      depositResponse,
      txHash: hash,
    };
  } catch (error) {
    console.error("Error submitting one click quote:", error);
    throw error;
  }
};
