import { nearFailoverRpcProvider } from "@defuse-protocol/internal-utils";
import { isAddress } from "viem";
import { z } from "zod";

type BlockId = string | number;
type Finality = "final" | "optimistic";
type BlockReference = { blockId: BlockId } | { finality: Finality };

export function decodeQueryResult<T>(
	response: unknown,
	schema: z.ZodType<T>,
): T {
	const parsed = z.object({ result: z.array(z.number()) }).parse(response);
	const uint8Array = new Uint8Array(parsed.result);
	const decoder = new TextDecoder();
	const result = decoder.decode(uint8Array);
	return schema.parse(JSON.parse(result));
}

export type OptionalBlockReference = {
	blockId?: BlockId;
	finality?: Finality;
};

function getBlockReference({
	blockId,
	finality,
}: OptionalBlockReference): BlockReference {
	if (blockId != null) {
		return { blockId };
	}

	if (finality != null) {
		return { finality };
	}

	return { finality: "optimistic" };
}

export async function queryContract({
	contractId,
	methodName,
	args,
	blockId,
	finality,
}: {
	contractId: string;
	methodName: string;
	args: Record<string, unknown>;
	blockId?: BlockId;
	finality?: Finality;
}): Promise<unknown> {
	const response = await nearClient.query({
		request_type: "call_function",
		account_id: contractId,
		method_name: methodName,
		args_base64: btoa(JSON.stringify(args)),
		...getBlockReference({ blockId, finality }),
	});

	return decodeQueryResult(response, z.unknown());
}

const ACCOUNT_ID_REGEX =
	/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

const IMPLICIT_ACCOUNT_MAX_LENGTH = 64;

export function isLegitAccountId(accountId: string): boolean {
	// EVM-like account check
	if (isAddress(accountId) && accountId === accountId.toLowerCase()) {
		return true;
	}

	// Explicit and implicit account check
	return ACCOUNT_ID_REGEX.test(accountId);
}

export function isImplicitAccount(accountId: string): boolean {
	return (
		accountId.length === IMPLICIT_ACCOUNT_MAX_LENGTH && !accountId.includes(".")
	);
}

const reserveRpcUrls = [
	"https://relmn.aurora.dev",
	"https://free.rpc.fastnear.com",
	"https://rpc.mainnet.near.org",
];

export const nearClient = nearFailoverRpcProvider({
	urls: reserveRpcUrls,
});
