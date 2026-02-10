import { poaBridge } from "@defuse-protocol/internal-utils";
import {
  OneClickService,
  type TokenResponse,
} from "@defuse-protocol/one-click-sdk-typescript";
import Fuse from "fuse.js";
import { formatUnits } from "viem";
import type { Token } from "./schema";

type PoaToken =
  poaBridge.httpClient.GetSupportedTokensResponse["result"]["tokens"][number];

interface PoaTokensResponse {
  tokens: PoaToken[];
}

interface SearchTokensOptions {
  limit?: number;
  threshold?: number;
}

interface SearchTokensBySymbolOptions {
  exact?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const SUPPORTED_TOKENS_TTL_MS = 5 * 60 * 1000;

let supportedTokensCache: Token[] | null = null;
let supportedTokensFetchedAt = 0;
let supportedTokensInFlight: Promise<Token[]> | null = null;

async function fetchSupportedTokens(): Promise<Token[]> {
  const [oneClickTokens, poaTokens] = await Promise.all([
    OneClickService.getTokens(),
    poaBridge.httpClient.getSupportedTokens({}) as Promise<PoaTokensResponse>,
  ]);

  const tokens: Token[] = [];
  for (const token of oneClickTokens) {
    const poaToken = poaTokens.tokens.find(
      (item) => item.intents_token_id === token.assetId
    );
    if (poaToken) {
      tokens.push(buildTokenFromData(token, poaToken));
    }
  }

  return tokens;
}

function buildTokenFromData(token: TokenResponse, poaToken: PoaToken): Token {
  const symbol =
    token.symbol === "wNEAR" && token.blockchain === "near"
      ? "NEAR"
      : token.symbol;

  return {
    contractAddress: token.contractAddress ?? null,
    intentsTokenId: poaToken.intents_token_id,
    nearTokenId: poaToken.near_token_id,
    defuseAssetIdentifier: poaToken.defuse_asset_identifier,
    standard: poaToken.standard,
    symbol,
    blockchain: token.blockchain,
    decimals: poaToken.decimals,
    priceUSD: String(token.price),
    minDepositAmount: poaToken.min_deposit_amount,
    minDepositAmountFormatted: formatUnits(
      BigInt(poaToken.min_deposit_amount),
      poaToken.decimals
    ),
    minWithdrawalAmount: poaToken.min_withdrawal_amount,
    minWithdrawalAmountFormatted: formatUnits(
      BigInt(poaToken.min_withdrawal_amount),
      poaToken.decimals
    ),
    withdrawalFee: poaToken.withdrawal_fee,
    withdrawalFeeFormatted: formatUnits(
      BigInt(poaToken.withdrawal_fee),
      poaToken.decimals
    ),
    balance: "0",
    balanceFormatted: "0",
  };
}

async function withTokenFallback<T>(
  message: string,
  fallback: T,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(message, error);
    return fallback;
  }
}

export async function getSupportedTokens(options?: {
  forceRefresh?: boolean;
}): Promise<Token[]> {
  return withTokenFallback("Error fetching supported tokens:", [], async () => {
    const now = Date.now();
    const forceRefresh = options?.forceRefresh ?? false;

    if (
      !forceRefresh &&
      supportedTokensCache &&
      now - supportedTokensFetchedAt < SUPPORTED_TOKENS_TTL_MS
    ) {
      return supportedTokensCache;
    }

    if (!forceRefresh && supportedTokensInFlight) {
      return supportedTokensInFlight;
    }

    const fetchPromise = fetchSupportedTokens()
      .then((tokens) => {
        supportedTokensCache = tokens;
        supportedTokensFetchedAt = Date.now();
        return tokens;
      })
      .finally(() => {
        supportedTokensInFlight = null;
      });

    supportedTokensInFlight = fetchPromise;
    return fetchPromise;
  });
}

export async function getToken(tokenId: string): Promise<Token | null> {
  return withTokenFallback("Error fetching token:", null, async () => {
    const tokens = await getSupportedTokens();
    const token = tokens.find(
      (item) =>
        item.intentsTokenId === tokenId ||
        item.nearTokenId === tokenId ||
        item.defuseAssetIdentifier === tokenId ||
        item.symbol.toLowerCase() === tokenId.toLowerCase()
    );

    return token ?? null;
  });
}

export async function searchTokens(
  query: string,
  options?: SearchTokensOptions
): Promise<Token[]> {
  return withTokenFallback("Error searching tokens:", [], async () => {
    const tokens = await getSupportedTokens();
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return tokens.slice(0, limit);
    }

    const fuse = new Fuse(tokens, {
      keys: [
        { name: "symbol", weight: 2 },
        { name: "nearTokenId", weight: 1.5 },
        { name: "blockchain", weight: 1 },
        { name: "defuseAssetIdentifier", weight: 1 },
      ],
      threshold: options?.threshold ?? 0.3,
      includeScore: true,
    });

    return fuse
      .search(normalizedQuery)
      .map((result) => result.item)
      .slice(0, limit);
  });
}

export async function searchTokensBySymbol(
  symbol: string,
  options?: SearchTokensBySymbolOptions
): Promise<Token[]> {
  return withTokenFallback("Error searching tokens by symbol:", [], async () => {
    const tokens = await getSupportedTokens();
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const normalizedSymbol = symbol.toLowerCase().trim();

    const filtered = options?.exact
      ? tokens.filter((token) => token.symbol.toLowerCase() === normalizedSymbol)
      : tokens.filter((token) =>
          token.symbol.toLowerCase().includes(normalizedSymbol)
        );

    return filtered.slice(0, limit);
  });
}

export async function getTokensByBlockchain(
  blockchain: string
): Promise<Token[]> {
  return withTokenFallback("Error fetching tokens by blockchain:", [], async () => {
    const tokens = await getSupportedTokens();
    const normalizedBlockchain = blockchain.toLowerCase();

    return tokens.filter(
      (token) => token.blockchain.toLowerCase() === normalizedBlockchain
    );
  });
}

export async function getTokenById(tokenId: string): Promise<Token | null> {
  return withTokenFallback("Error fetching token by id:", null, async () => {
    const tokens = await getSupportedTokens();
    return tokens.find((token) => token.intentsTokenId === tokenId) ?? null;
  });
}
