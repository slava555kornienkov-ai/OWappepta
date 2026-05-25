import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bookings, users, supportChats, supportMessages, promotions, wheelRewards } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

export const adminRouter = createRouter({
  dashboard: adminQuery.query(async () => {
    const db = getDb();

    const allBookings = await db.select().from(bookings);
    const allUsers = await db.select().from(users);
    const allWheelRewards = await db.select().from(wheelRewards);

    const revenue = allBookings
      .filter((b) => b.paymentStatus === "confirmed" || b.paymentStatus === "paid")
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const todayBookings = allBookings.filter(
      (b) => b.date === new Date().toISOString().split("T")[0]
    ).length;

    // Chart data (last 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayRevenue = allBookings
        .filter((b) => b.date === dateStr && (b.paymentStatus === "confirmed" || b.paymentStatus === "paid"))
        .reduce((sum, b) => sum + b.totalPrice, 0);
      chartData.push({ date: dateStr, revenue: dayRevenue });
    }

    return {
      revenue,
      bookings: todayBookings,
      totalBookings: allBookings.length,
      users: allUsers.length,
      wheelSpins: allWheelRewards.length,
      chartData,
    };
  }),

  listBookings: adminQuery
    .input(
      z
        .object({
          status: z.string().optional(),
          date: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const allBookings = await db
        .select()
        .from(bookings)
        .orderBy(desc(bookings.createdAt));

      // Get user info for each booking
      const bookingsWithUsers = await Promise.all(
        allBookings.map(async (booking) => {
          const [user] = await db.select().from(users).where(eq(users.id, booking.userId)).limit(1);
          return { ...booking, user: user ? { fullName: user.fullName, phone: user.phone } : null };
        })
      );

      let filtered = bookingsWithUsers;
      if (input?.status) {
        filtered = filtered.filter((b) => b.paymentStatus === input.status || b.bookingStatus === input.status);
      }
      if (input?.date) {
        filtered = filtered.filter((b) => b.date === input.date);
      }

      return filtered;
    }),

  confirmPayment: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(bookings)
        .set({ paymentStatus: "confirmed", bookingStatus: "confirmed" })
        .where(eq(bookings.id, input.id));
      return { success: true };
    }),

  cancelBooking: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(bookings)
        .set({ paymentStatus: "cancelled", bookingStatus: "cancelled" })
        .where(eq(bookings.id, input.id));
      return { success: true };
    }),

  listUsers: adminQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
        return allUsers.filter(
          (u) =>
            (u.fullName && u.fullName.toLowerCase().includes(input.search!.toLowerCase())) ||
            (u.phone && u.phone.includes(input.search!))
        );
      }
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),

  updateUser: adminQuery
    .input(
      z.object({
        id: z.number(),
        bonuses: z.number().optional(),
        role: z.enum(["user", "admin", "employee"]).optional(),
        subscriptionHours: z.number().optional(),
        wheelSpins: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb()
        .update(users)
        .set(data)
        .where(eq(users.id, id));
      const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
      return user;
    }),

  listSupportChats: adminQuery.query(async () => {
    const db = getDb();
    const chats = await db.select().from(supportChats).orderBy(desc(supportChats.lastMessageAt));

    return await Promise.all(
      chats.map(async (chat) => {
        const [user] = await db.select().from(users).where(eq(users.id, chat.userId)).limit(1);
        const [lastMessage] = await db
          .select()
          .from(supportMessages)
          .where(eq(supportMessages.chatId, chat.id))
          .orderBy(desc(supportMessages.createdAt))
          .limit(1);
        const unreadCount = await db
          .select()
          .from(supportMessages)
          .where(and(eq(supportMessages.chatId, chat.id), eq(supportMessages.senderRole, "user"), eq(supportMessages.isRead, false)));

        return {
          ...chat,
          user: user ? { fullName: user.fullName, phone: user.phone } : null,
          lastMessage: lastMessage ?? null,
          unreadCount: unreadCount.length,
        };
      })
    );
  }),

  getSupportChat: adminQuery
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [chat] = await db.select().from(supportChats).where(eq(supportChats.id, input.chatId)).limit(1);
      const [user] = chat ? await db.select().from(users).where(eq(users.id, chat.userId)).limit(1) : [null];
      const messages = chat
        ? await db.select().from(supportMessages).where(eq(supportMessages.chatId, chat.id)).orderBy(supportMessages.createdAt)
        : [];

      return { chat, user, messages };
    }),

  sendSupportMessage: adminQuery
    .input(z.object({ chatId: z.number(), message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(supportMessages)
        .values({
          chatId: input.chatId,
          senderId: 0, // Admin system ID
          senderRole: "admin",
          message: input.message,
        })
        .$returningId();

      await db
        .update(supportChats)
        .set({ lastMessageAt: new Date() })
        .where(eq(supportChats.id, input.chatId));

      const [message] = await db.select().from(supportMessages).where(eq(supportMessages.id, id)).limit(1);
      return message;
    }),

  createPromotion: adminQuery
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        image: z.string().optional(),
        terms: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
        discount: z.number().optional(),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const [{ id }] = await getDb()
        .insert(promotions)
        .values(input)
        .$returningId();
      const [promo] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
      return promo;
    }),

  updatePromotion: adminQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        terms: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        discount: z.number().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb()
        .update(promotions)
        .set(data)
        .where(eq(promotions.id, id));
      const [promo] = await getDb().select().from(promotions).where(eq(promotions.id, id)).limit(1);
      return promo;
    }),

  deletePromotion: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(promotions).where(eq(promotions.id, input.id));
      return { success: true };
    }),
});
