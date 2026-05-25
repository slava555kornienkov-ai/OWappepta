import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, Users, MessageCircle, Tag, Bell,
  ArrowLeft, TrendingUp, CheckCircle, XCircle, QrCode, Lock
} from "lucide-react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store";

type AdminTab = "dashboard" | "bookings" | "users" | "support" | "promotions" | "notifications" | "scanner";

const sidebarItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "bookings", label: "Бронирования", icon: CalendarDays },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "scanner", label: "QR Сканер", icon: QrCode },
  { id: "support", label: "Поддержка", icon: MessageCircle },
  { id: "promotions", label: "Акции", icon: Tag },
  { id: "notifications", label: "Уведомления", icon: Bell },
];

export default function Admin() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const showToast = useStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [qrInput, setQrInput] = useState("");

  const { data: dashboard } = trpc.admin.dashboard.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: bookingsList, refetch: refetchBookings } = trpc.admin.listBookings.useQuery({}, { enabled: user?.role === "admin" });
  const { data: usersList } = trpc.admin.listUsers.useQuery({}, { enabled: user?.role === "admin" });
  const { data: supportChats } = trpc.admin.listSupportChats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: promoList } = trpc.promotion.list.useQuery();

  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { refetchBookings(); showToast("Оплата подтверждена", "success"); } });
  const cancelBooking = trpc.admin.cancelBooking.useMutation({ onSuccess: () => { refetchBookings(); showToast("Бронирование отменено", "success"); } });
  const confirmVisit = trpc.qr.confirmVisit.useMutation();

  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const { data: chatDetail } = trpc.admin.getSupportChat.useQuery(
    { chatId: selectedChat! },
    { enabled: !!selectedChat }
  );
  const sendSupportMsg = trpc.admin.sendSupportMessage.useMutation({
    onSuccess: () => {
      setChatMessage("");
      // refetch chat
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-[#0B1628] flex items-center justify-center text-white">Загрузка...</div>;
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0B1628] flex flex-col items-center justify-center p-4">
        <Lock size={48} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Доступ ограничен</h2>
        <p className="text-sm text-white/50 mb-6">Требуются права администратора</p>
        <button onClick={() => navigate("/")} className="accent-gradient text-[#0B1628] px-6 py-2.5 rounded-xl font-semibold">
          Вернуться
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Выручка", value: `${(dashboard?.revenue ?? 0).toLocaleString()}₽`, icon: TrendingUp, color: "text-[#40E0D0]" },
                { label: "Бронирования", value: String(dashboard?.bookings ?? 0), icon: CalendarDays, color: "text-[#2196F3]" },
                { label: "Пользователи", value: String(dashboard?.users ?? 0), icon: Users, color: "text-[#20B2AA]" },
                { label: "Прокруток", value: String(dashboard?.wheelSpins ?? 0), icon: TrendingUp, color: "text-[#FFD700]" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4">
                  <stat.icon size={20} className={stat.color} />
                  <p className="text-xl font-bold text-white mt-2">{stat.value}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
            {/* Revenue Chart */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Выручка за 7 дней</h3>
              <div className="flex items-end gap-2 h-32">
                {dashboard?.chartData.map((d, i) => {
                  const max = Math.max(...(dashboard?.chartData.map(dd => dd.revenue) ?? [1]));
                  const height = max > 0 ? (d.revenue / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-lg bg-[#40E0D0]/30 border-t border-[#40E0D0]"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[8px] text-white/40">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "bookings":
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Бронирования</h2>
            {bookingsList?.map((booking) => (
              <div key={booking.id} className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50">#{booking.bookingNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    booking.bookingStatus === "completed" ? "bg-green-500/20 text-green-400" :
                    booking.bookingStatus === "confirmed" ? "bg-cyan-500/20 text-cyan-400" :
                    booking.bookingStatus === "cancelled" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{booking.bookingStatus}</span>
                </div>
                <p className="text-sm text-white">{booking.user?.fullName || "—"} · {booking.user?.phone || "—"}</p>
                <p className="text-xs text-white/50">{booking.date} · {booking.startTime} · {booking.duration}ч · {booking.boardsCount} доск</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-[#40E0D0]">{booking.totalPrice.toLocaleString()}₽</span>
                  <div className="flex gap-2">
                    {booking.paymentStatus === "paid" && (
                      <button onClick={() => confirmPayment.mutate({ id: booking.id })} className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 flex items-center gap-1">
                        <CheckCircle size={12} /> Подтвердить
                      </button>
                    )}
                    {booking.bookingStatus !== "cancelled" && booking.bookingStatus !== "completed" && (
                      <button onClick={() => cancelBooking.mutate({ id: booking.id })} className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-1">
                        <XCircle size={12} /> Отменить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )) ?? <p className="text-white/40">Нет бронирований</p>}
          </div>
        );

      case "users":
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Пользователи</h2>
            {usersList?.map((u) => (
              <div key={u.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#40E0D0]/10 flex items-center justify-center text-[#40E0D0] font-bold text-sm shrink-0">
                  {(u.fullName || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{u.fullName || "—"}</p>
                  <p className="text-xs text-white/50">{u.phone || u.unionId}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-yellow-400">{u.bonuses} бонусов</p>
                  <p className="text-[10px] text-white/30">{u.visitsCount} посещений</p>
                </div>
              </div>
            )) ?? <p className="text-white/40">Нет пользователей</p>}
          </div>
        );

      case "scanner":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">QR Сканер</h2>
            <div className="glass-card p-4">
              <p className="text-sm text-white/60 mb-3">Введите QR-токен для подтверждения посещения</p>
              <input
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Вставьте токен..."
                className="w-full bg-[#152238] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 border border-[rgba(64,224,208,0.1)] focus:border-[#40E0D0]/30 outline-none mb-3"
              />
              <button
                onClick={async () => {
                  if (!qrInput.trim()) return;
                  try {
                    const result = await confirmVisit.mutateAsync({ token: qrInput.trim() });
                    showToast(`Посещение подтверждено! +${result.bonusesEarned} бонусов`, "success");
                    setQrInput("");
                  } catch {
                    showToast("Ошибка подтверждения", "error");
                  }
                }}
                className="w-full accent-gradient text-[#0B1628] font-semibold py-3 rounded-xl"
              >
                Подтвердить посещение
              </button>
            </div>
          </div>
        );

      case "support":
        return selectedChat ? (
          <div className="space-y-3">
            <button onClick={() => setSelectedChat(null)} className="text-sm text-[#40E0D0] flex items-center gap-1">
              <ArrowLeft size={16} /> Назад
            </button>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {chatDetail?.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderRole === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                    msg.senderRole === "user" ? "glass-card text-white" : "accent-gradient text-[#0B1628]"
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && chatMessage.trim() && sendSupportMsg.mutate({ chatId: selectedChat, message: chatMessage.trim() })}
                placeholder="Ответить..."
                className="flex-1 bg-[#152238] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 border border-[rgba(64,224,208,0.1)] outline-none"
              />
              <button
                onClick={() => chatMessage.trim() && sendSupportMsg.mutate({ chatId: selectedChat, message: chatMessage.trim() })}
                className="accent-gradient text-[#0B1628] px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Отправить
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Чаты поддержки</h2>
            {supportChats?.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className="w-full glass-card p-3 flex items-center gap-3 text-left hover:border-[rgba(64,224,208,0.25)]"
              >
                <div className="w-10 h-10 rounded-full bg-[#40E0D0]/10 flex items-center justify-center text-[#40E0D0] font-bold shrink-0">
                  {(chat.user?.fullName || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{chat.user?.fullName || "—"}</p>
                  <p className="text-xs text-white/50 truncate">{chat.lastMessage?.message || "Нет сообщений"}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#EF5350] text-white text-[10px] flex items-center justify-center shrink-0">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            )) ?? <p className="text-white/40">Нет активных чатов</p>}
          </div>
        );

      case "promotions":
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Акции</h2>
            {promoList?.map((promo) => (
              <div key={promo.id} className="glass-card p-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-white">{promo.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${promo.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {promo.active ? "Активна" : "Неактивна"}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1">{promo.startDate} — {promo.endDate}</p>
              </div>
            )) ?? <p className="text-white/40">Нет акций</p>}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Отправить уведомление</h2>
            <NotificationSender />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1628] text-white">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-[rgba(64,224,208,0.1)]">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-[#40E0D0]">
          <ArrowLeft size={18} /> <span className="text-sm">Назад</span>
        </button>
        <h1 className="text-sm font-semibold">Админ панель</h1>
        <div className="w-16" />
      </div>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex flex-col w-60 min-h-screen border-r border-[rgba(64,224,208,0.1)] p-4 gap-1">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <LayoutDashboard size={16} className="text-[#0B1628]" />
            </div>
            <span className="font-bold text-[#40E0D0]">Open Waters</span>
          </div>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activeTab === item.id ? "bg-[#40E0D0]/10 text-[#40E0D0]" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          <div className="mt-auto">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/50 hover:text-white">
              <ArrowLeft size={18} /> В Mini App
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Mobile Tab Selector */}
          <div className="lg:hidden flex overflow-x-auto gap-2 mb-4 scrollbar-hide">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === item.id ? "accent-gradient text-[#0B1628]" : "bg-[#152238] text-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NotificationSender() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const sendNotification = trpc.notification.send.useMutation();
  const showToast = useStore((s) => s.showToast);

  const handleSend = () => {
    if (!title.trim() || !text.trim()) return;
    sendNotification.mutate({ title: title.trim(), text: text.trim() }, {
      onSuccess: () => {
        showToast("Уведомление отправлено!", "success");
        setTitle("");
        setText("");
      },
    });
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок"
        className="w-full bg-[#152238] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 border border-[rgba(64,224,208,0.1)] outline-none"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Текст уведомления"
        rows={3}
        className="w-full bg-[#152238] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 border border-[rgba(64,224,208,0.1)] outline-none resize-none"
      />
      <button
        onClick={handleSend}
        disabled={!title.trim() || !text.trim()}
        className="w-full accent-gradient text-[#0B1628] font-semibold py-3 rounded-xl disabled:opacity-30"
      >
        Отправить всем
      </button>
    </div>
  );
}
