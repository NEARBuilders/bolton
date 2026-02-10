import { KeyPairString } from "@/types/near";
import {
  createIntentSignerNearKeyPair,
  IntentsSDK,
} from "@defuse-protocol/intents-sdk";
import { KeyPair } from "near-api-js";
import { getNearWalletFromKeyPair } from "./wallet";

export async function getNearIntentsSDK({
  privateKey,
}: {
  privateKey: KeyPairString;
}): Promise<IntentsSDK> {
  const keyPair = KeyPair.fromString(privateKey);
  const account = getNearWalletFromKeyPair(keyPair);

  return new IntentsSDK({
    env: "production",
    referral: "bolton-bot",
    intentSigner: createIntentSignerNearKeyPair({
      signer: keyPair as any,
      accountId: account.accountId,
    }),
  });
}
