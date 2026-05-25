import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wheelRewards, users } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

const WHEEL_SEGMENTS = [
  { type: "discount_5" as const, value: "5%", weight: 25, label: "Скидка 5%" },
  { type: "discount_10" as const, value: "10%", weight: 20, label: "Скидка 10%" },
  { type: "discount_15" as const, value: "15%", weight: 10, label: "Скидка 15%" },
  { type: "bonus_50" as const, value: "50", weight: 20, label: "50 бонусов" },
  { type: "bonus_100" as const, value: "100", weight: 15, label: "100 бонусов" },
  { type: "bonus_150" as const, value: "150", weight: 5, label: "150 бонусов" },
  { type: "bonus_200" as const, value: "200", weight: 3, label: "200 бонусов" },
  { type: "free_hour" as const, value: "1 час", weight: 2, label: "Бесплатный час" },
];

function spinWheel() {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const segment of WHEEL_SEGMENTS) {
    random -= segment.weight;
    if (random <= 0) return segment;
  }
  return WHEEL_SEGMENTS[0];
}

export const wheelRouter = createRouter({
  spin: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user || user.wheelSpins <= 0) {
      throw new Error("No spins available");
    }

    const reward = spinWheel();

    // Deduct spin
    await db
      .update(users)
      .set({ wheelSpins: user.wheelSpins - 1 })
      .where(eq(users.id, ctx.user.id));

    // Create reward record
    await db.insert(wheelRewards).values({
      userId: ctx.user.id,
      rewardType: reward.type,
      rewardValue: reward.value,
    });

    // Apply bonus rewards immediately
    if (reward.type.startsWith("bonus_")) {
      const bonusAmount = parseInt(reward.value);
      await db
        .update(users)
        .set({ bonuses: user.bonuses + bonusAmount })
        .where(eq(users.id, ctx.user.id));
    }

    return {
      reward: {
        type: reward.type,
        value: reward.value,
        label: reward.label,
      },
      spinsLeft: user.wheelSpins - 1,
    };
  }),

  history: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(wheelRewards)
      .where(eq(wheelRewards.userId, ctx.user.id))
      .orderBy(desc(wheelRewards.createdAt));
  }),

  useReward: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(wheelRewards)
        .set({ used: true, usedAt: new Date() })
        .where(and(eq(wheelRewards.id, input.id), eq(wheelRewards.userId, ctx.user.id)));
      return { success: true };
    }),
});
