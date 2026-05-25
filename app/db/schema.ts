import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  timestamp,
  int,
  boolean,
} from "drizzle-orm/mysql-core";

// ==========================================
// Users
// ==========================================
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  telegramId: varchar("telegramId", { length: 255 }),
  fullName: varchar("fullName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  bonuses: int("bonuses").default(0).notNull(),
  visitsCount: int("visitsCount").default(0).notNull(),
  totalSpent: int("totalSpent").default(0).notNull(),
  wheelSpins: int("wheelSpins").default(0).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
  subscriptionHours: int("subscriptionHours").default(0).notNull(),
  role: mysqlEnum("role", ["user", "admin", "employee"]).default("user").notNull(),
  verificationCode: varchar("verificationCode", { length: 10 }),
  verificationCodeExpiry: timestamp("verificationCodeExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==========================================
// Bookings
// ==========================================
export const bookings = mysqlTable("bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 20 }).notNull().unique(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  duration: int("duration").notNull(),
  boardsCount: int("boardsCount").default(1).notNull(),
  instructorsCount: int("instructorsCount").default(0).notNull(),
  rescuers: boolean("rescuers").default(false).notNull(),
  totalPrice: int("totalPrice").notNull(),
  usedBonuses: int("usedBonuses").default(0).notNull(),
  earnedBonuses: int("earnedBonuses").default(0).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "confirmed", "cancelled"]).default("pending").notNull(),
  bookingStatus: mysqlEnum("bookingStatus", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  paymentScreenshot: text("paymentScreenshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ==========================================
// Referrals
// ==========================================
export const referrals = mysqlTable("referrals", {
  id: serial("id").primaryKey(),
  inviterId: bigint("inviterId", { mode: "number", unsigned: true }).notNull(),
  invitedId: bigint("invitedId", { mode: "number", unsigned: true }).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed"]).default("pending").notNull(),
  bonusAwarded: boolean("bonusAwarded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

// ==========================================
// Wheel Rewards
// ==========================================
export const wheelRewards = mysqlTable("wheel_rewards", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  rewardType: mysqlEnum("rewardType", ["discount_5", "discount_10", "discount_15", "bonus_50", "bonus_100", "bonus_150", "bonus_200", "free_hour"]).notNull(),
  rewardValue: varchar("rewardValue", { length: 50 }).notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WheelReward = typeof wheelRewards.$inferSelect;

// ==========================================
// Support Chats
// ==========================================
export const supportChats = mysqlTable("support_chats", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  employeeId: bigint("employeeId", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportChat = typeof supportChats.$inferSelect;

// ==========================================
// Support Messages
// ==========================================
export const supportMessages = mysqlTable("support_messages", {
  id: serial("id").primaryKey(),
  chatId: bigint("chatId", { mode: "number", unsigned: true }).notNull(),
  senderId: bigint("senderId", { mode: "number", unsigned: true }).notNull(),
  senderRole: mysqlEnum("senderRole", ["user", "employee", "admin"]).default("user").notNull(),
  message: text("message").notNull(),
  attachments: text("attachments"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupportMessage = typeof supportMessages.$inferSelect;

// ==========================================
// Notifications
// ==========================================
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  text: text("text").notNull(),
  type: mysqlEnum("type", ["booking", "payment", "bonus", "wheel", "promo", "system"]).default("system").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ==========================================
// Promotions
// ==========================================
export const promotions = mysqlTable("promotions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  image: text("image"),
  terms: text("terms"),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  endDate: varchar("endDate", { length: 10 }).notNull(),
  discount: int("discount").default(0),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;

// ==========================================
// QR Sessions
// ==========================================
export const qrSessions = mysqlTable("qr_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QrSession = typeof qrSessions.$inferSelect;
