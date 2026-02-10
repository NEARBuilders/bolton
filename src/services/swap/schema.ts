import type { QuoteResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { z } from "zod";

// Request schemas
export const swapQuoteRequestSchema = z.object({
	fromTokenId: z.string().min(1, "From token ID is required"),
	toTokenId: z.string().min(1, "To token ID is required"),
	amount: z.string().min(1, "Amount is required"),
});

export const swapExecuteRequestSchema = z.object({
	quoteId: z.string().min(1, "Quote ID is required"),
});

// Response schemas with discriminated unions
const swapQuoteSuccessSchema = z.object({
	status: z.literal("success"),
	quoteId: z.string(),
	fromTokenId: z.string(),
	toTokenId: z.string(),
	amountIn: z.string(),
	amountInFormatted: z.string(),
	amountOut: z.string(),
	amountOutFormatted: z.string(),
	exchangeRate: z.string(),
	expiresAt: z.number(),
});

const swapQuoteErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const swapQuoteResponseSchema = z.discriminatedUnion("status", [
	swapQuoteSuccessSchema,
	swapQuoteErrorSchema,
]);

const swapExecuteSuccessSchema = z.object({
	status: z.literal("success"),
	txHash: z.string(),
	explorerLink: z.string(),
});

const swapExecuteErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const swapExecuteResponseSchema = z.discriminatedUnion("status", [
	swapExecuteSuccessSchema,
	swapExecuteErrorSchema,
]);

// Internal types for service layer (includes quote for caching)
export interface SwapQuoteSuccessInternal {
	status: "success";
	quoteId: string;
	quote: QuoteResponse;
	fromTokenId: string;
	toTokenId: string;
	amountIn: string;
	amountInFormatted: string;
	amountOut: string;
	amountOutFormatted: string;
	exchangeRate: string;
	expiresAt: number;
}

export interface SwapQuoteErrorInternal {
	status: "error";
	message: string;
}

export type SwapQuoteResultInternal =
	| SwapQuoteSuccessInternal
	| SwapQuoteErrorInternal;

// Type exports for API responses
export type SwapQuoteRequest = z.infer<typeof swapQuoteRequestSchema>;
export type SwapQuoteResponse = z.infer<typeof swapQuoteResponseSchema>;
export type SwapExecuteRequest = z.infer<typeof swapExecuteRequestSchema>;
export type SwapExecuteResponse = z.infer<typeof swapExecuteResponseSchema>;

// Cached quote interface
export interface CachedSwapQuote {
	quoteId: string;
	userId: string;
	quote: QuoteResponse;
	fromTokenId: string;
	toTokenId: string;
	amountIn: string;
	amountInFormatted: string;
	amountOut: string;
	amountOutFormatted: string;
	exchangeRate: string;
	createdAt: number;
	expiresAt: number;
}
