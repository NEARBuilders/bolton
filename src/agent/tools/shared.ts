import { loadConfig } from "@/config";
import { getTokenBalances } from "@/services/balance";
import { getTokenById, getSupportedTokens } from "@/services/tokens";
import type { Token } from "@/services/tokens/schema";

export interface ToolExecutionContext {
  telegramUserId?: number;
  chatId?: number;
  botApi?: unknown;
}

export function getToolContext(context: unknown): ToolExecutionContext {
  if (!context || typeof context !== "object") {
    return {};
  }

  const maybe = context as Record<string, unknown>;

  return {
    telegramUserId:
      typeof maybe.telegramUserId === "number" ? maybe.telegramUserId : undefined,
    chatId: typeof maybe.chatId === "number" ? maybe.chatId : undefined,
    botApi: maybe.botApi,
  };
}

export async function resolveTokenRef(
  tokenRef: string,
  options?: { walletAddress?: string }
): Promise<Token | null> {
  const byId = await getTokenById(tokenRef);
  if (byId) return byId;

  const normalized = tokenRef.trim().toLowerCase();
  const all = await getSupportedTokens();
  const exactSymbol = all.filter(
    (token) => token.symbol.toLowerCase() === normalized
  );

  if (exactSymbol.length === 1) {
    return exactSymbol[0];
  }

  if (exactSymbol.length > 1) {
    const walletAddress = options?.walletAddress;
    if (walletAddress) {
      const balances = await getTokenBalances({ walletAddress });
      const heldTokenIds = new Set(
        balances
          .filter((token) => token.balance !== "0")
          .map((token) => token.intentsTokenId)
      );
      const exactSymbolWithBalance = exactSymbol.filter((token) =>
        heldTokenIds.has(token.intentsTokenId)
      );

      if (exactSymbolWithBalance.length === 1) {
        return exactSymbolWithBalance[0];
      }
    }

    return null;
  }

  const exactIntentsId = all.find(
    (token) => token.intentsTokenId.toLowerCase() === normalized
  );

  return exactIntentsId ?? null;
}

export async function resolveTokenRefOrThrow(
  tokenRef: string,
  options?: { walletAddress?: string }
): Promise<Token> {
  const token = await resolveTokenRef(tokenRef, options);
  if (!token) {
    throw new Error(
      `Token not found or ambiguous: ${tokenRef}. Use precise token id if needed, or use searchToken/searchTokenBalance first.`
    );
  }
  return token;
}

export function getWalletConfig() {
  return loadConfig();
}
