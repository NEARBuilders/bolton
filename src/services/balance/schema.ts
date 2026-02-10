import { z } from "zod";

// Response schemas
export const tokenBalanceSchema = z.object({
	balance: z.string(),
	balanceFormatted: z.string(),
	logoURI: z.string().nullable(),
	contractAddress: z.string().nullable(),
	intentsTokenId: z.string(),
	nearTokenId: z.string(),
	defuseAssetIdentifier: z.string(),
	standard: z.string(),
	symbol: z.string(),
	blockchain: z.string(),
	decimals: z.number(),
	priceUSD: z.string(),
	minDepositAmount: z.string(),
	minDepositAmountFormatted: z.string(),
	minWithdrawalAmount: z.string(),
	minWithdrawalAmountFormatted: z.string(),
	withdrawalFee: z.string(),
	withdrawalFeeFormatted: z.string(),
});

export const balanceResponseSchema = z.object({
	balances: z.array(tokenBalanceSchema),
	count: z.number(),
});

export const errorResponseSchema = z.object({
	error: z.string(),
});

// Type exports
export type TokenBalance = z.infer<typeof tokenBalanceSchema>;
export type BalanceResponse = z.infer<typeof balanceResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
