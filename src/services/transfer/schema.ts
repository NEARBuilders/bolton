import { z } from "zod";

// Request schema
export const transferRequestSchema = z.object({
	tokenId: z.string().min(1, "Token ID is required"),
	amount: z.string().min(1, "Amount is required"),
	toAddress: z.string().min(1, "Destination address is required"),
});

// Response schemas with discriminated unions
const transferQuoteSuccessSchema = z.object({
	status: z.literal("success"),
	tokenId: z.string(),
	amount: z.string(),
	amountFormatted: z.string(),
	toAddress: z.string(),
});

const transferQuoteErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const transferQuoteResponseSchema = z.discriminatedUnion("status", [
	transferQuoteSuccessSchema,
	transferQuoteErrorSchema,
]);

const transferSubmitSuccessSchema = z.object({
	status: z.literal("success"),
	txHash: z.string(),
	explorerLink: z.string(),
});

const transferSubmitErrorSchema = z.object({
	status: z.literal("error"),
	message: z.string(),
});

export const transferSubmitResponseSchema = z.discriminatedUnion("status", [
	transferSubmitSuccessSchema,
	transferSubmitErrorSchema,
]);

// Internal types for service layer
export interface TransferQuoteSuccess {
	status: "success";
	tokenId: string;
	amount: string;
	amountFormatted: string;
	toAddress: string;
}

export interface TransferQuoteError {
	status: "error";
	message: string;
}

export type TransferQuoteResult = TransferQuoteSuccess | TransferQuoteError;

// Type exports for API responses
export type TransferRequest = z.infer<typeof transferRequestSchema>;
export type TransferQuoteResponse = z.infer<typeof transferQuoteResponseSchema>;
export type TransferSubmitResponse = z.infer<
	typeof transferSubmitResponseSchema
>;
