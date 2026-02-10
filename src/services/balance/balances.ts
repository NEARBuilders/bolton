import { AuthMethod, authIdentity } from "@defuse-protocol/internal-utils";
import { formatUnits } from "viem";
import { getSupportedTokens } from "../tokens";
import { batchBalanceOf } from "./batch";
import type { TokenBalance } from "./schema";

const BALANCE_TTL_MS = 15 * 1000;

type BalanceCacheEntry = {
  fetchedAt: number;
  data: TokenBalance[];
  inFlight?: Promise<TokenBalance[]>;
};

const balanceCache = new Map<string, BalanceCacheEntry>();

export async function getTokenBalances({
	walletAddress,
	forceRefresh,
}: {
	walletAddress: string;
	forceRefresh?: boolean;
}): Promise<TokenBalance[]> {
	try {
		const force = forceRefresh ?? false;
		const now = Date.now();
		const cached = balanceCache.get(walletAddress);

		if (
			!force &&
			cached?.data &&
			now - cached.fetchedAt < BALANCE_TTL_MS
		) {
			return cached.data;
		}

		if (!force && cached?.inFlight) {
			return cached.inFlight;
		}

		const accountId = authIdentity.authHandleToIntentsUserId(
			walletAddress,
			AuthMethod.Near,
		);
		const supportedTokens = await getSupportedTokens();

		const tokenIds = supportedTokens.map((token) => token.intentsTokenId);
		const fetchPromise = batchBalanceOf({
			accountId,
			tokenIds,
		}).then((amountsArray) => {
			const amounts: Record<string, bigint> = {};

			for (let i = 0; i < tokenIds.length; i++) {
				amounts[tokenIds[i]] = BigInt(amountsArray[i]);
			}

			const result = supportedTokens
				.map((token) => ({
					...token,
					balance: String(amounts[token.intentsTokenId]),
					balanceFormatted: formatUnits(
						amounts[token.intentsTokenId],
						token.decimals,
					),
					logoURI: null,
				}))
				.filter((token) => token.balance !== "0") as TokenBalance[];

			balanceCache.set(walletAddress, {
				data: result,
				fetchedAt: Date.now(),
			});

			return result;
		});

		balanceCache.set(walletAddress, {
			data: cached?.data ?? [],
			fetchedAt: cached?.fetchedAt ?? 0,
			inFlight: fetchPromise,
		});

		return fetchPromise;
	} catch (error) {
		console.error(error);
		return [] as TokenBalance[];
	}
}
