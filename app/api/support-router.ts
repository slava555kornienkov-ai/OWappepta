import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { supportChats, supportMessages } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const supportRouter = createRouter({
  getChat: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Find or create chat for user
    let [chat] = await db
      .select()
      .from(supportChats)
      .where(eq(supportChats.userId, ctx.user.id))
      .limit(1);

    if (!chat) {
      const [{ id }] = await db
        .insert(supportChats)
        .values({ userId: ctx.user.id })
        .$returningId();
      [chat] = await db.select().from(supportChats).where(eq(supportChats.id, id)).limit(1);
    }

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.chatId, chat.id))
      .orderBy(supportMessages.createdAt);

    return { chat, messages };
  }),

  sendMessage: authedQuery
    .input(z.object({ message: z.string().min(1), attachments: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [chat] = await db
        .select()
        .from(supportChats)
        .where(eq(supportChats.userId, ctx.user.id))
        .limit(1);

      if (!chat) throw new Error("Chat not found");

      const [{ id }] = await db
        .insert(supportMessages)
        .values({
          chatId: chat.id,
          senderId: ctx.user.id,
          senderRole: "user",
          message: input.message,
          attachments: input.attachments,
        })
        .$returningId();

      // Update last message time
      await db
        .update(supportChats)
        .set({ lastMessageAt: new Date() })
        .where(eq(supportChats.id, chat.id));

      const [message] = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.id, id))
        .limit(1);

      return message;
    }),

  markRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();

    const [chat] = await db
      .select()
      .from(supportChats)
      .where(eq(supportChats.userId, ctx.user.id))
      .limit(1);

    if (!chat) return { success: false };

    await db
      .update(supportMessages)
      .set({ isRead: true })
      .where(and(eq(supportMessages.chatId, chat.id), eq(supportMessages.senderRole, "employee")));

    return { success: true };
  }),
});
