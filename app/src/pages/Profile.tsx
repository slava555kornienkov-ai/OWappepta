import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Coins, MapPin, Wallet, RotateCw, Copy, Pencil,
  MessageCircle, Star, ChevronRight, Calendar
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useStore } from "@/store";

export default function Profile() {
  const { data: user, refetch } = trpc.auth.me.useQuery();
  const { data: bookingHistory } = trpc.booking.list.useQuery();
  const { data: referralData } = trpc.referral.getCode.useQuery();
  const { data: qrData } = trpc.qr.generate.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation({ onSuccess: () => refetch() });

  const showToast = useStore((s) => s.showToast);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [historyTab, setHistoryTab] = useState<"visits" | "bookings">("visits");
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    if (!qrData) return;
    setCountdown(300);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetch();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData, refetch]);

  const stats = [
    { label: "Баланс", value: user?.bonuses ?? 0, icon: Coins, color: "text-yellow-400" },
    { label: "Посещений", value: user?.visitsCount ?? 0, icon: MapPin, color: "text-[#40E0D0]" },
    { label: "Потрачено", value: `${(user?.totalSpent ?? 0).toLocaleString()}₽`, icon: Wallet, color: "text-[#2196F3]" },
    { label: "Прокруток", value: user?.wheelSpins ?? 0, icon: RotateCw, color: "text-[#20B2AA]" },
  ];

  const handleCopyReferral = () => {
    if (referralData?.code) {
      navigator.clipboard.writeText(`https://t.me/openwaters_bot?start=${referralData.code}`);
      showToast("Ссылка скопирована!", "success");
    }
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateProfile.mutate({ fullName: newName.trim() });
    }
    setEditingName(false);
  };

  const completedBookings = bookingHistory?.filter((b) => b.bookingStatus === "completed") ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="pb-24 pt-4 px-4 space-y-4"
    >
      {/* Avatar & Name */}
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full p-[3px] accent-gradient">
          <div className="w-full h-full rounded-full bg-[#0B1628] flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[#40E0D0]">
                {(user?.fullName || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {editingName ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-[#152238] border border-[rgba(64,224,208,0.3)] rounded-lg px-3 py-1.5 text-white text-sm w-40"
              placeholder="Ваше имя"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <button onClick={handleSaveName} className="text-[#40E0D0] text-sm">Сохранить</button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{user?.fullName || "Пользователь"}</h1>
            <button onClick={() => { setNewName(user?.fullName || ""); setEditingName(true); }}>
              <Pencil size={14} className="text-white/40 hover:text-[#40E0D0]" />
            </button>
          </div>
        )}
        <p className="text-sm text-white/50 mt-1">{user?.phone || "Телефон не указан"}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-3 flex flex-col items-center text-center"
          >
            <stat.icon size={18} className={stat.color} />
            <span className="text-base font-bold text-white mt-1.5">{stat.value}</span>
            <span className="text-[10px] text-white/50 mt-0.5">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* QR Code */}
      <div className="glass-card p-5 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-white/70 mb-3">Ваш QR-код</h3>
        <div className="bg-white p-3 rounded-xl shadow-lg">
          <QRCodeSVG
            value={qrData?.qrData || "open-waters-placeholder"}
            size={160}
            level="M"
          />
        </div>
        <p className="text-xs text-white/50 mt-3 text-center">
          Покажите QR сотруднику для подтверждения
        </p>
        <p className="text-xs text-[#40E0D0] mt-1">
          Обновление через {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
        </p>
      </div>

      {/* Subscription */}
      {(user?.subscriptionHours ?? 0) > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50">Абонемент</p>
              <p className="text-2xl font-bold text-[#40E0D0]">{user?.subscriptionHours} <span className="text-sm font-normal">часов</span></p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-[#40E0D0] flex items-center justify-center">
              <span className="text-xs font-bold text-[#40E0D0]">Активен</span>
            </div>
          </div>
        </div>
      )}

      {/* Referral Card */}
      <div className="glass-card p-4 border border-[rgba(255,215,0,0.2)]">
        <div className="flex items-center gap-2 mb-3">
          <Star size={16} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">Пригласите друга</h3>
        </div>
        <p className="text-xs text-white/60 mb-3">
          Вы получите +300 бонусов, а ваш друг +100 за регистрацию
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-[#152238] rounded-lg px-3 py-2 text-xs text-white/70 truncate">
            t.me/openwaters_bot?start={referralData?.code}
          </div>
          <button
            onClick={handleCopyReferral}
            className="accent-gradient rounded-lg px-3 py-2 flex items-center gap-1"
          >
            <Copy size={14} className="text-[#0B1628]" />
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <div className="flex gap-4 mb-3 px-1">
          <button
            onClick={() => setHistoryTab("visits")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              historyTab === "visits" ? "text-[#40E0D0] border-[#40E0D0]" : "text-white/40 border-transparent"
            }`}
          >
            Посещения
          </button>
          <button
            onClick={() => setHistoryTab("bookings")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              historyTab === "bookings" ? "text-[#40E0D0] border-[#40E0D0]" : "text-white/40 border-transparent"
            }`}
          >
            Бронирования
          </button>
        </div>

        <AnimatePresence mode="wait">
          {historyTab === "visits" ? (
            <motion.div key="visits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {completedBookings.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <MapPin size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">Пока нет посещений</p>
                </div>
              ) : (
                completedBookings.map((booking) => (
                  <div key={booking.id} className="glass-card p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#40E0D0]/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#40E0D0]">{booking.date.split("-")[2]}</span>
                      <span className="text-[8px] text-white/50">
                        {["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"][parseInt(booking.date.split("-")[1]) - 1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{booking.startTime} · {booking.duration}ч</p>
                      <p className="text-xs text-white/50">{booking.boardsCount} доск{booking.boardsCount > 1 ? "и" : "а"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">{booking.totalPrice.toLocaleString()}₽</p>
                      <p className="text-xs text-green-400">+{booking.earnedBonuses} бонусов</p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="bookings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {(!bookingHistory || bookingHistory.length === 0) ? (
                <div className="glass-card p-6 text-center">
                  <Calendar size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">Пока нет бронирований</p>
                </div>
              ) : (
                bookingHistory.map((booking) => (
                  <div key={booking.id} className="glass-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-white/40" />
                        <span className="text-sm text-white">{booking.date} · {booking.startTime}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        booking.bookingStatus === "completed" ? "bg-green-500/20 text-green-400" :
                        booking.bookingStatus === "confirmed" ? "bg-cyan-500/20 text-cyan-400" :
                        booking.bookingStatus === "cancelled" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {booking.bookingStatus === "completed" ? "Завершено" :
                         booking.bookingStatus === "confirmed" ? "Подтверждено" :
                         booking.bookingStatus === "cancelled" ? "Отменено" : "Ожидание"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/50">{booking.boardsCount} доск{booking.boardsCount > 1 ? "и" : "а"} · {booking.duration}ч</span>
                      <span className="text-sm font-semibold text-white">{booking.totalPrice.toLocaleString()}₽</span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Support & Feedback Buttons */}
      <div className="space-y-2 pb-4">
        <button className="w-full glass-card p-3 flex items-center gap-3 text-left hover:border-[rgba(64,224,208,0.25)] transition-colors">
          <MessageCircle size={18} className="text-[#40E0D0]" />
          <span className="text-sm text-white">Написать в поддержку</span>
          <ChevronRight size={16} className="text-white/30 ml-auto" />
        </button>
        <button className="w-full glass-card p-3 flex items-center gap-3 text-left hover:border-[rgba(64,224,208,0.25)] transition-colors">
          <Star size={18} className="text-yellow-400" />
          <span className="text-sm text-white">Оставить отзыв</span>
          <ChevronRight size={16} className="text-white/30 ml-auto" />
        </button>
      </div>
    </motion.div>
  );
}
