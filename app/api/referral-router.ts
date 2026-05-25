import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { referrals, users } from "@db/schema";
import { eq, and } from "drizzle-orm";

function generateReferralCode(): string {
  return "OW" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const referralRouter = createRouter({
  getCode: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user) return { code: "", rewards: 0 };

    let code = user.referralCode;
    if (!code) {
      code = generateReferralCode();
      await db.update(users).set({ referralCode: code }).where(eq(users.id, ctx.user.id));
    }

    const referralCount = await db
      .select()
      .from(referrals)
      .where(eq(referrals.inviterId, ctx.user.id));

    return { code, rewards: referralCount.length };
  }),

  applyCode: authedQuery
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Find inviter by code
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, input.code))
        .limit(1);

      if (!inviter) throw new Error("Invalid referral code");
      if (inviter.id === ctx.user.id) throw new Error("Cannot use your own code");

      // Check if already referred
      const [existing] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.invitedId, ctx.user.id))
        .limit(1);

      if (existing) throw new Error("You have already used a referral code");

      // Create referral record
      await db.insert(referrals).values({
        inviterId: inviter.id,
        invitedId: ctx.user.id,
        referralCode: input.code,
        status: "pending",
      });

      // Award initial bonus to invited user
      const [invitedUser] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (invitedUser) {
        await db
          .update(users)
          .set({ bonuses: invitedUser.bonuses + 100 })
          .where(eq(users.id, ctx.user.id));
      }

      return { success: true, bonuses: 100 };
    }),

  myReferrals: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(referrals)
      .where(eq(referrals.inviterId, ctx.user.id));
  }),

  completeReferral: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();

    // Find pending referral for this user
    const [pendingReferral] = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.invitedId, ctx.user.id), eq(referrals.status, "pending")))
      .limit(1);

    if (!pendingReferral || pendingReferral.bonusAwarded) return { success: false };

    // Award bonus to inviter
    const [inviter] = await db.select().from(users).where(eq(users.id, pendingReferral.inviterId)).limit(1);
    if (inviter) {
      await db
        .update(users)
        .set({ bonuses: inviter.bonuses + 300 })
        .where(eq(users.id, inviter.id));
    }

    // Mark as completed
    await db
      .update(referrals)
      .set({ status: "completed", bonusAwarded: true })
      .where(eq(referrals.id, pendingReferral.id));

    return { success: true };
  }),
});
