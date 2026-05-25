import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Minus, Plus, PersonStanding, GraduationCap, Shield, Coins, ChevronLeft, ChevronRight
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useStore } from "@/store";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const startDay = (firstDay.getDay() + 6) % 7; // Monday start
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function BookingPage() {
  const { data: user, refetch: refetchUser } = trpc.auth.me.useQuery();
  const createBooking = trpc.booking.create.useMutation();

  const showToast = useStore((s) => s.showToast);

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Booking options
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(2);
  const [boards, setBoards] = useState(1);
  const [instructors, setInstructors] = useState(0);
  const [rescuers, setRescuers] = useState(false);
  const [useBonuses, setUseBonuses] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time slots 10:00 - 21:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 10; h <= 20; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 21) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  // Calculate price
  const price = useMemo(() => {
    if (!selectedDate) return null;
    const day = new Date(selectedDate).getDay();
    const isWeekend = day === 0 || day === 6;

    const basePrices = isWeekend ? [0, 2000, 3200, 4200, 5000] : [0, 1700, 2800, 3800, 4700];
    let basePrice: number;
    if (duration <= 4) {
      basePrice = basePrices[duration];
    } else {
      const extra = isWeekend ? 700 : 600;
      basePrice = basePrices[4] + (duration - 4) * extra;
    }

    const supPrice = basePrice * boards;
    const instructorPrice = instructors * 2000 * duration;
    const rescuerPrice = rescuers ? 2500 * duration : 0;
    const subtotal = supPrice + instructorPrice + rescuerPrice;
    const maxBonus = Math.floor(subtotal * 0.3);
    const actualBonus = Math.min(useBonuses, maxBonus, user?.bonuses ?? 0);
    const total = subtotal - actualBonus;

    return { supPrice, instructorPrice, rescuerPrice, subtotal, bonusDiscount: actualBonus, total };
  }, [selectedDate, duration, boards, instructors, rescuers, useBonuses, user?.bonuses]);

  const handleDateSelect = (day: number) => {
    const dateStr = formatDate(calYear, calMonth, day);
    if (new Date(dateStr) < new Date(today.toISOString().split("T")[0])) return;
    setSelectedDate(dateStr);
    setSelectedTime("");
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !price) return;
    setIsSubmitting(true);
    try {
      await createBooking.mutateAsync({
        date: selectedDate,
        startTime: selectedTime,
        duration,
        boardsCount: boards,
        instructorsCount: instructors,
        rescuers,
        usedBonuses: price.bonusDiscount,
      });
      showToast("Бронирование создано!", "success");
      refetchUser();
      setShowConfirm(false);
      setSelectedDate("");
      setSelectedTime("");
    } catch (err: any) {
      showToast(err.message || "Ошибка бронирования", "error");
    }
    setIsSubmitting(false);
  };

  const days = getDaysInMonth(calYear, calMonth);
  const todayStr = today.toISOString().split("T")[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="pb-32 pt-4 px-4 space-y-4"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Бронирование</h1>
        <p className="text-sm text-white/50 mt-1">Выберите дату и время</p>
      </div>

      {/* Calendar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setCalMonth(m => m === 0 ? 11 : m - 1); if (calMonth === 0) setCalYear(y => y - 1); }}>
            <ChevronLeft size={20} className="text-white/60" />
          </button>
          <span className="text-sm font-semibold text-white">{MONTHS[calMonth]} {calYear}</span>
          <button onClick={() => { setCalMonth(m => m === 11 ? 0 : m + 1); if (calMonth === 11) setCalYear(y => y + 1); }}>
            <ChevronRight size={20} className="text-white/60" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] text-white/40 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = formatDate(calYear, calMonth, day);
            const isPast = dateStr < todayStr;
            const isSelected = selectedDate === dateStr;
            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
            return (
              <button
                key={day}
                disabled={isPast}
                onClick={() => handleDateSelect(day)}
                className={`h-9 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? "accent-gradient text-[#0B1628]"
                    : isPast
                    ? "text-white/20 cursor-not-allowed"
                    : isWeekend
                    ? "text-[#40E0D0]/70 bg-[#40E0D0]/5 hover:bg-[#40E0D0]/10"
                    : "text-white bg-[#152238] hover:bg-[#1a2d42]"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selector */}
      {selectedDate && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Время начала</h3>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((time) => {
              const [h] = time.split(":").map(Number);
              const disabled = h + duration > 21;
              return (
                <button
                  key={time}
                  disabled={disabled}
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTime === time
                      ? "accent-gradient text-[#0B1628]"
                      : disabled
                      ? "text-white/20 bg-white/5 cursor-not-allowed line-through"
                      : "text-white bg-[#152238] border border-[rgba(64,224,208,0.2)] hover:border-[#40E0D0]/50"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Duration */}
      {selectedTime && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Длительность</h3>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setDuration(d => Math.max(1, d - 1))}
              className="w-10 h-10 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0] hover:bg-[#1a2d42]"
            >
              <Minus size={18} />
            </button>
            <div className="text-center min-w-[80px]">
              <span className="text-2xl font-bold text-white">{duration}</span>
              <span className="text-sm text-white/50 ml-1">час{duration > 1 ? "а" : ""}</span>
            </div>
            <button
              onClick={() => setDuration(d => Math.min(8, d + 1))}
              className="w-10 h-10 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0] hover:bg-[#1a2d42]"
            >
              <Plus size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Options */}
      {selectedTime && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* SUP Boards */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PersonStanding size={18} className="text-[#40E0D0]" />
                <span className="text-sm font-medium text-white">SUP доски</span>
              </div>
              <span className="text-xs text-white/50">{boards} шт.</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setBoards(b => Math.max(1, b - 1))} className="w-8 h-8 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0]"><Minus size={14} /></button>
              <span className="text-lg font-semibold text-white min-w-[30px] text-center">{boards}</span>
              <button onClick={() => setBoards(b => Math.min(10, b + 1))} className="w-8 h-8 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0]"><Plus size={14} /></button>
            </div>
          </div>

          {/* Instructors */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-[#2196F3]" />
                <span className="text-sm font-medium text-white">Инструктор</span>
              </div>
              <span className="text-xs text-white/50">2000₽/час</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setInstructors(v => Math.max(0, v - 1))} className="w-8 h-8 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0]"><Minus size={14} /></button>
              <span className="text-lg font-semibold text-white min-w-[30px] text-center">{instructors}</span>
              <button onClick={() => setInstructors(v => Math.min(5, v + 1))} className="w-8 h-8 rounded-lg bg-[#152238] flex items-center justify-center text-[#40E0D0]"><Plus size={14} /></button>
            </div>
          </div>

          {/* Rescuers */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#20B2AA]" />
              <div>
                <span className="text-sm font-medium text-white">Бригада спасателей</span>
                <p className="text-xs text-white/50">2500₽/час</p>
              </div>
            </div>
            <button
              onClick={() => setRescuers(!rescuers)}
              className={`w-12 h-6 rounded-full transition-colors relative ${rescuers ? "bg-[#40E0D0]" : "bg-[#152238]"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${rescuers ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {/* Bonus slider */}
          {(user?.bonuses ?? 0) > 0 && price && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins size={18} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">Списать бонусы</span>
                <span className="text-xs text-white/50 ml-auto">Доступно: {user?.bonuses}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.min(user?.bonuses ?? 0, Math.floor(price.subtotal * 0.3))}
                value={useBonuses}
                onChange={(e) => setUseBonuses(Number(e.target.value))}
                className="w-full accent-[#40E0D0]"
              />
              <p className="text-xs text-[#40E0D0] mt-1">Будет списано: {useBonuses} бонусов</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Price Summary */}
      {price && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-16 left-0 right-0 z-40 bg-[#0B1628]/95 backdrop-blur-xl border-t border-[rgba(64,224,208,0.15)] p-4"
        >
          <div className="max-w-[480px] mx-auto space-y-2">
            {price.instructorPrice > 0 && (
              <div className="flex justify-between text-xs text-white/50">
                <span>Инструкторы</span>
                <span>{price.instructorPrice.toLocaleString()}₽</span>
              </div>
            )}
            {price.rescuerPrice > 0 && (
              <div className="flex justify-between text-xs text-white/50">
                <span>Спасатели</span>
                <span>{price.rescuerPrice.toLocaleString()}₽</span>
              </div>
            )}
            {price.bonusDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-400">
                <span>Скидка бонусами</span>
                <span>-{price.bonusDiscount.toLocaleString()}₽</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm text-white/70">Итого</span>
              <span className="text-xl font-bold text-[#40E0D0]">{price.total.toLocaleString()}₽</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowConfirm(true)}
              className="w-full accent-gradient text-[#0B1628] font-semibold py-3 rounded-xl"
            >
              Забронировать
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-5 max-w-[350px] w-full"
          >
            <h3 className="text-lg font-bold text-white mb-3">Подтвердите бронирование</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Дата</span><span className="text-white">{selectedDate}</span></div>
              <div className="flex justify-between"><span className="text-white/50">Время</span><span className="text-white">{selectedTime} · {duration}ч</span></div>
              <div className="flex justify-between"><span className="text-white/50">Доски</span><span className="text-white">{boards} шт.</span></div>
              <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-white/70">Сумма</span><span className="text-lg font-bold text-[#40E0D0]">{price?.total.toLocaleString()}₽</span></div>
            </div>
            <p className="text-xs text-white/40 mt-3">Оплата производится переводом на карту. Администратор подтвердит бронирование вручную.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-[rgba(64,224,208,0.3)] text-white text-sm">Отмена</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 accent-gradient text-[#0B1628] font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Подтвердить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
