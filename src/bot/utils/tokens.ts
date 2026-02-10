import type { Token } from "@/services/tokens/schema";

export function findTokenMatches(
  tokens: Token[],
  tokenArg: string,
  chainArg?: string
): Token[] {
  const normalizedToken = tokenArg.toLowerCase();
  const normalizedChain = chainArg?.toLowerCase();

  let matches = tokens.filter(
    (token) =>
      token.symbol.toLowerCase() === normalizedToken ||
      token.intentsTokenId.toLowerCase() === normalizedToken
  );

  if (normalizedChain) {
    matches = matches.filter(
      (token) =>
        token.blockchain.toLowerCase() === normalizedChain ||
        token.intentsTokenId.toLowerCase().startsWith(`${normalizedChain}:`)
    );
  }

  return matches;
}
