import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { qrSessions, users, bookings } from "@db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export const qrRouter = createRouter({
  generate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate old unused sessions
    await db
      .update(qrSessions)
      .set({ used: true })
      .where(and(eq(qrSessions.userId, ctx.user.id), eq(qrSessions.used, false)));

    await db.insert(qrSessions).values({
      userId: ctx.user.id,
      token,
      expiresAt,
    });

    return {
      qrData: JSON.stringify({ token, userId: ctx.user.id, exp: expiresAt.toISOString() }),
      expiresAt,
    };
  }),

  verify: adminQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [session] = await db
        .select()
        .from(qrSessions)
        .where(and(eq(qrSessions.token, input.token), eq(qrSessions.used, false)))
        .limit(1);

      if (!session) return { valid: false };
      if (new Date() > session.expiresAt) return { valid: false, error: "QR expired" };

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user) return { valid: false };

      // Find today's booking
      const today = new Date().toISOString().split("T")[0];
      const [booking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, session.userId),
            eq(bookings.date, today),
            eq(bookings.bookingStatus, "confirmed")
          )
        )
        .limit(1);

      return {
        valid: true,
        user: { id: user.id, fullName: user.fullName, phone: user.phone },
        booking: booking ?? null,
      };
    }),

  confirmVisit: adminQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [session] = await db
        .select()
        .from(qrSessions)
        .where(and(eq(qrSessions.token, input.token), eq(qrSessions.used, false)))
        .limit(1);

      if (!session) throw new Error("Invalid or used QR token");

      // Mark QR as used
      await db
        .update(qrSessions)
        .set({ used: true, usedAt: new Date() })
        .where(eq(qrSessions.id, session.id));

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (!user) throw new Error("User not found");

      // Find and complete today's booking
      const today = new Date().toISOString().split("T")[0];
      const [booking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, session.userId),
            eq(bookings.date, today),
            eq(bookings.bookingStatus, "confirmed")
          )
        )
        .limit(1);

      if (booking) {
        const bonusesEarned = Math.floor(booking.totalPrice * 0.05);

        await db
          .update(bookings)
          .set({ bookingStatus: "completed", earnedBonuses: bonusesEarned })
          .where(eq(bookings.id, booking.id));

        await db
          .update(users)
          .set({
            bonuses: user.bonuses + bonusesEarned,
            visitsCount: user.visitsCount + 1,
            totalSpent: user.totalSpent + booking.totalPrice,
            wheelSpins: user.wheelSpins + 1,
          })
          .where(eq(users.id, user.id));

        return {
          success: true,
          booking,
          bonusesEarned,
          spinAwarded: true,
        };
      }

      // No booking — just award spin and update stats
      await db
        .update(users)
        .set({
          visitsCount: user.visitsCount + 1,
          wheelSpins: user.wheelSpins + 1,
        })
        .where(eq(users.id, user.id));

      return {
        success: true,
        booking: null,
        bonusesEarned: 0,
        spinAwarded: true,
      };
    }),
});
