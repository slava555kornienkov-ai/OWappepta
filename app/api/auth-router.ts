import { z } from "zod";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
  updateProfile: authedQuery
    .input(z.object({ fullName: z.string().optional(), phone: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id));
      const [user] = await getDb().select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return user;
    }),
});
