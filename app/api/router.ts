import { authRouter } from "./auth-router";
import { bookingRouter } from "./booking-router";
import { wheelRouter } from "./wheel-router";
import { referralRouter } from "./referral-router";
import { supportRouter } from "./support-router";
import { promotionRouter } from "./promotion-router";
import { qrRouter } from "./qr-router";
import { notificationRouter } from "./notification-router";
import { adminRouter } from "./admin-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  booking: bookingRouter,
  wheel: wheelRouter,
  referral: referralRouter,
  support: supportRouter,
  promotion: promotionRouter,
  qr: qrRouter,
  notification: notificationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
