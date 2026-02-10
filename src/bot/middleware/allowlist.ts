import type { Context, MiddlewareFn } from "grammy";

import { env } from "@/config";

function buildAllowlist(): Set<number> {
  const allowlist = new Set<number>();

  if (env.TELEGRAM_USER_ID) {
    allowlist.add(env.TELEGRAM_USER_ID);
  }

  if (env.TELEGRAM_USER_IDS) {
    for (const id of env.TELEGRAM_USER_IDS.split(",")) {
      const trimmed = id.trim();
      if (!trimmed) continue;

      const parsed = parseInt(trimmed, 10);
      if (Number.isFinite(parsed)) {
        allowlist.add(parsed);
      }
    }
  }

  return allowlist;
}

const allowlist = buildAllowlist();

export function createAllowlistMiddleware(): MiddlewareFn<Context> {
  return async function enforceAllowlist(ctx, next) {
    const userId = ctx.from?.id;
    if (!userId || !allowlist.has(userId)) {
      return;
    }
    await next();
  };
}
