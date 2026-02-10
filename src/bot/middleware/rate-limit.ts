import type { Context, MiddlewareFn } from "grammy";

import { createMemoryStorage } from "@/bot/storage/memory";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

export function createRateLimitMiddleware(): MiddlewareFn<Context> {
  const storage = createMemoryStorage<string>();

  return async function enforceRateLimit(ctx, next) {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    const now = Date.now();
    const key = `ratelimit:${userId}`;
    const data = await storage.read(key);

    const resetTime = data ? parseInt(data.split(":")[1] || "0") : 0;
    const count = data ? parseInt(data.split(":")[0] || "0") : 0;

    if (now > resetTime) {
      await storage.write(key, `1:${now + WINDOW_MS}`);
      await next();
      return;
    }

    if (count >= MAX_REQUESTS) {
      const waitTime = Math.ceil((resetTime - now) / 1000);
      await ctx.reply(
        `Too many requests. Please wait ${waitTime} seconds before trying again.`
      );
      return;
    }

    await storage.write(key, `${count + 1}:${resetTime}`);
    await next();
  };
}
