import {
	type AuthMethod,
	authIdentity,
	poaBridge,
} from "@defuse-protocol/internal-utils";

export async function getDepositAddress({
	authIdentifier,
	authMethod,
	assetId,
}: {
	authIdentifier: string;
	authMethod: AuthMethod;
	assetId: string;
}) {
	let depositAddress: string;
	let chain: string;
	let memo: string | null;
	try {
		const accountId = authIdentity.authHandleToIntentsUserId(
			authIdentifier,
			authMethod,
		);

		const [blockchain, type] = assetId.split(":");
		chain = `${blockchain}:${type}`;

		const quoteResponse = await poaBridge.httpClient.getDepositAddress({
			account_id: accountId,
			chain,
			deposit_mode: blockchain.includes("stellar") ? "MEMO" : "SIMPLE",
		});

		if (!quoteResponse.address) {
			throw new Error("Deposit address not found");
		}

		depositAddress = quoteResponse.address;
		memo = quoteResponse.memo ?? null;
	} catch (error) {
		console.error(error);
		throw new Error("Failed to get deposit address");
	}

	return {
		address: depositAddress,
		chain: chain,
		memo: memo,
	};
}
