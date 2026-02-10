import { z } from "zod";

// Request schemas
export const depositAddressRequestSchema = z.object({
	assetId: z.string().min(1, "assetId is required"),
});

// Response schemas
export const depositAddressResponseSchema = z.object({
	address: z.string(),
	chain: z.string(),
	memo: z.string().nullable(),
});

export const errorResponseSchema = z.object({
	error: z.string(),
});

// Type exports
export type DepositAddressRequest = z.infer<typeof depositAddressRequestSchema>;
export type DepositAddressResponse = z.infer<
	typeof depositAddressResponseSchema
>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
