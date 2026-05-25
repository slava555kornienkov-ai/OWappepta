import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const notificationRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt));
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, ctx.user.id));
    return { success: true };
  }),

  // Admin: send notification
  send: adminQuery
    .input(
      z.object({
        userId: z.number().optional(),
        title: z.string().min(1),
        text: z.string().min(1),
        type: z.enum(["booking", "payment", "bonus", "wheel", "promo", "system"]).default("system"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.userId) {
        await db.insert(notifications).values({
          userId: input.userId,
          title: input.title,
          text: input.text,
          type: input.type,
        });
      } else {
        // Send to all users — get all user IDs
        const { users } = await import("@db/schema");
        const allUsers = await db.select({ id: users.id }).from(users);
        for (const user of allUsers) {
          await db.insert(notifications).values({
            userId: user.id,
            title: input.title,
            text: input.text,
            type: input.type,
          });
        }
      }
      return { success: true };
    }),
});
