import { relations } from "drizzle-orm";
import { users, bookings, referrals, wheelRewards, supportChats, supportMessages, notifications } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  wheelRewards: many(wheelRewards),
  supportChats: many(supportChats),
  notifications: many(notifications),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  inviter: one(users, { fields: [referrals.inviterId], references: [users.id] }),
  invited: one(users, { fields: [referrals.invitedId], references: [users.id] }),
}));

export const wheelRewardsRelations = relations(wheelRewards, ({ one }) => ({
  user: one(users, { fields: [wheelRewards.userId], references: [users.id] }),
}));

export const supportChatsRelations = relations(supportChats, ({ one, many }) => ({
  user: one(users, { fields: [supportChats.userId], references: [users.id] }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  chat: one(supportChats, { fields: [supportMessages.chatId], references: [supportChats.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
