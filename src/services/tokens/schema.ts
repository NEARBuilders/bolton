import { z } from "zod";

// Request schemas
export const searchQuerySchema = z.object({
	query: z.string().min(1, "Query is required"),
});

// Response schemas
export const tokenSchema = z.object({
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

	balance: z.string().nullable(),
	balanceFormatted: z.string().nullable(),
});

export const tokensListResponseSchema = z.object({
	tokens: z.array(tokenSchema),
});

export const tokenResponseSchema = z.object({
	token: tokenSchema,
});

export const errorResponseSchema = z.object({
	error: z.string(),
	tokenId: z.string().optional(),
});

// Type exports
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type Token = z.infer<typeof tokenSchema>;
export type TokensListResponse = z.infer<typeof tokensListResponseSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
