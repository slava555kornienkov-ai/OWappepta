import { getDb } from "../api/queries/connection";
import { promotions } from "./schema";

async function seed() {
  const db = getDb();

  // Seed promotions
  const existingPromos = await db.select().from(promotions);
  if (existingPromos.length === 0) {
    await db.insert(promotions).values([
      {
        title: "Будни со скидкой 20%",
        description: "Аренда SUP с понедельника по четверг со скидкой 20%. Идеальное время для спокойной прогулки!",
        image: "/promo-1.jpg",
        terms: "Скидка действует с понедельника по четверг. Не суммируется с другими акциями.",
        startDate: "2025-05-01",
        endDate: "2025-09-30",
        discount: 20,
        active: true,
      },
      {
        title: "Групповая прогулка",
        description: "Приведи 4 друзей и получи час аренды бесплатно! Чем больше, тем веселее.",
        image: "/promo-2.jpg",
        terms: "Бесплатный час начисляется после оплаты группового бронирования от 5 человек.",
        startDate: "2025-05-01",
        endDate: "2025-08-31",
        discount: 0,
        active: true,
      },
      {
        title: "Утренняя сессия -50%",
        description: "Скидка 50% на бронирование с 10:00 до 12:00. Лучшее время для медитации на воде.",
        image: "/promo-3.jpg",
        terms: "Скидка действует на утренние часы с 10:00 до 12:00 включительно.",
        startDate: "2025-06-01",
        endDate: "2025-08-31",
        discount: 50,
        active: true,
      },
    ]);
    console.log("Promotions seeded successfully");
  }

  console.log("Seed completed");
}

seed().catch(console.error);
