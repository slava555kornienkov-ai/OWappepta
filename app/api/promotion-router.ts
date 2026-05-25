import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { promotions } from "@db/schema";
import { eq } from "drizzle-orm";

export const promotionRouter = createRouter({
  list: publicQuery.query(async () => {
    return getDb()
      .select()
      .from(promotions)
      .where(eq(promotions.active, true));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [promo] = await getDb()
        .select()
        .from(promotions)
        .where(eq(promotions.id, input.id))
        .limit(1);
      return promo ?? null;
    }),
});
