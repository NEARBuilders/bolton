import { Account, type KeyPair, KeyPairSigner } from "near-api-js";
import { getNearProvider } from "./provider";

export const getNearSignerFromKeyPair = (keyPair: KeyPair) => {
  const signer = new KeyPairSigner(keyPair);
  return signer;
};
export const getNearWalletFromKeyPair = (keyPair: KeyPair): Account => {
  const signer = getNearSignerFromKeyPair(keyPair);
  const address = getNearAddressFromKeyPair(keyPair);
  const provider = getNearProvider();
  const account = new Account(address, provider, signer);
  return account;
};

export const getNearAddressFromKeyPair = (keyPair: KeyPair) => {
  return Buffer.from(keyPair.getPublicKey().data).toString("hex");
};
