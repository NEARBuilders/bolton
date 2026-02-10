import { providers } from "near-api-js";

export const getNearProvider = () => {
  return new providers.JsonRpcProvider({
    url: "https://rpc.mainnet.fastnear.com",
  });
};
