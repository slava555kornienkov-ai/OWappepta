import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bookings } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

function generateBookingNumber(): string {
  return "OW" + Date.now().toString(36).toUpperCase();
}

function calculatePrice(
  date: string,
  duration: number,
  boards: number,
  instructors: number,
  rescuers: boolean,
  usedBonuses: number
) {
  const day = new Date(date).getDay();
  const isWeekend = day === 0 || day === 6;

  const basePrices = isWeekend
    ? [0, 2000, 3200, 4200, 5000]
    : [0, 1700, 2800, 3800, 4700];

  let basePrice: number;
  if (duration <= 4) {
    basePrice = basePrices[duration];
  } else {
    const extraHourRate = isWeekend ? 700 : 600;
    basePrice = basePrices[4] + (duration - 4) * extraHourRate;
  }

  const supPrice = basePrice * boards;
  const instructorPrice = instructors * 2000 * duration;
  const rescuerPrice = rescuers ? 2500 * duration : 0;
  const subtotal = supPrice + instructorPrice + rescuerPrice;
  const maxBonusDiscount = Math.floor(subtotal * 0.3);
  const actualBonusUsed = Math.min(usedBonuses, maxBonusDiscount);
  const total = subtotal - actualBonusUsed;

  return { subtotal, supPrice, instructorPrice, rescuerPrice, bonusDiscount: actualBonusUsed, total };
}

export const bookingRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(bookings)
      .where(eq(bookings.userId, ctx.user.id))
      .orderBy(desc(bookings.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [booking] = await getDb()
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.id))
        .limit(1);
      return booking ?? null;
    }),

  create: authedQuery
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        duration: z.number().min(1).max(8),
        boardsCount: z.number().min(1).max(10).default(1),
        instructorsCount: z.number().min(0).max(5).default(0),
        rescuers: z.boolean().default(false),
        usedBonuses: z.number().min(0).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const price = calculatePrice(
        input.date,
        input.duration,
        input.boardsCount,
        input.instructorsCount,
        input.rescuers,
        input.usedBonuses
      );

      const [startHour] = input.startTime.split(":").map(Number);
      const endHour = startHour + input.duration;
      if (endHour > 21) {
        throw new Error("Booking must end by 21:00");
      }

      const [{ id }] = await getDb()
        .insert(bookings)
        .values({
          bookingNumber: generateBookingNumber(),
          userId: ctx.user.id,
          date: input.date,
          startTime: input.startTime,
          duration: input.duration,
          boardsCount: input.boardsCount,
          instructorsCount: input.instructorsCount,
          rescuers: input.rescuers,
          totalPrice: price.total,
          usedBonuses: price.bonusDiscount,
          paymentStatus: "pending",
          bookingStatus: "pending",
        })
        .$returningId();

      const booking = await getDb()
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      return { booking: booking[0], price };
    }),

  cancel: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(bookings)
        .set({ bookingStatus: "cancelled", paymentStatus: "cancelled" })
        .where(and(eq(bookings.id, input.id), eq(bookings.userId, ctx.user.id)));
      return { success: true };
    }),

  uploadPayment: authedQuery
    .input(z.object({ id: z.number(), screenshot: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(bookings)
        .set({ paymentScreenshot: input.screenshot, paymentStatus: "paid" })
        .where(and(eq(bookings.id, input.id), eq(bookings.userId, ctx.user.id)));
      return { success: true };
    }),
});
