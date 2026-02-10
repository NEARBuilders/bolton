import type { QuoteResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { z } from "zod";

// Request schemas
export const withdrawQuoteRequestSchema = z.object({
	assetId: z.string().min(1, "Asset ID is required"),
	amount: z.string().min(1, "Amount is required"),
});

export const withdrawSubmitRequestSchema = z.object({
	quoteId: z.string().min(1, "Quote ID is required"),
});

// Response schemas with discriminated unions
const withdrawQuoteSuccessSchema = z.object({
	status: z.literal("success"),
	quoteId: z.string(),
	assetId: z.string(),
	amount: z.string(),
	amountFormatted: z.string(),
	destinationAddress: z.string(),
	receivedAmount: z.string(),
	receivedAmountFormatted: z.string(),
	transferFee: z.string(),
	transferFeeFormatted: z.string(),
	expiresAt: z.number(),
});

const withdrawQuoteErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const withdrawQuoteResponseSchema = z.discriminatedUnion("status", [
	withdrawQuoteSuccessSchema,
	withdrawQuoteErrorSchema,
]);

const withdrawSubmitSuccessSchema = z.object({
	status: z.literal("success"),
	txHash: z.string(),
	explorerLink: z.string(),
});

const withdrawSubmitErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const withdrawSubmitResponseSchema = z.discriminatedUnion("status", [
	withdrawSubmitSuccessSchema,
	withdrawSubmitErrorSchema,
]);

// Internal types for service layer (includes quote for caching)
export interface WithdrawQuoteSuccessInternal {
	status: "success";
	quoteId: string;
	quote: QuoteResponse;
	assetId: string;
	amount: string;
	amountFormatted: string;
	destinationAddress: string;
	receivedAmount: string;
	receivedAmountFormatted: string;
	transferFee: string;
	transferFeeFormatted: string;
	expiresAt: number;
}

export interface WithdrawQuoteErrorInternal {
	status: "error";
	message: string;
}

export type WithdrawQuoteResultInternal =
	| WithdrawQuoteSuccessInternal
	| WithdrawQuoteErrorInternal;

// Type exports for API responses
export type WithdrawQuoteRequest = z.infer<typeof withdrawQuoteRequestSchema>;
export type WithdrawQuoteResponse = z.infer<typeof withdrawQuoteResponseSchema>;
export type WithdrawSubmitRequest = z.infer<typeof withdrawSubmitRequestSchema>;
export type WithdrawSubmitResponse = z.infer<
	typeof withdrawSubmitResponseSchema
>;

// Cached quote interface
export interface CachedWithdrawQuote {
	quoteId: string;
	userId: string;
	quote: QuoteResponse;
	assetId: string;
	amount: string;
	amountFormatted: string;
	destinationAddress: string;
	receivedAmount: string;
	receivedAmountFormatted: string;
	transferFee: string;
	transferFeeFormatted: string;
	createdAt: number;
	expiresAt: number;
}
