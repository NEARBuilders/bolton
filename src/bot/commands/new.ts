import { deleteAiChatSession } from "@/bot/ai/store";
import { Context } from "grammy";

export async function handleNew(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Unable to reset chat context right now. Please try again.", {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  await deleteAiChatSession(userId);
  await ctx.reply("Started a new chat. Your previous context was cleared.", {
    reply_markup: { remove_keyboard: true },
  });
}
