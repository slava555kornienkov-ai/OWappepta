import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, RotateCw } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useStore } from "@/store";

const SEGMENTS = [
  { type: "discount_5", label: "Скидка\n5%", color: "#40E0D0", angle: 0 },
  { type: "bonus_50", label: "50\nбонусов", color: "#2196F3", angle: 45 },
  { type: "discount_10", label: "Скидка\n10%", color: "#20B2AA", angle: 90 },
  { type: "bonus_100", label: "100\nбонусов", color: "#FFD700", angle: 135 },
  { type: "discount_15", label: "Скидка\n15%", color: "#40E0D0", angle: 180 },
  { type: "bonus_150", label: "150\nбонусов", color: "#2196F3", angle: 225 },
  { type: "free_hour", label: "Бесплатный\nчас", color: "#4CAF50", angle: 270 },
  { type: "bonus_200", label: "200\nбонусов", color: "#FFD700", angle: 315 },
];

export default function Wheel() {
  const { data: user, refetch: refetchUser } = trpc.auth.me.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.wheel.history.useQuery();
  const spinMutation = trpc.wheel.spin.useMutation();

  const showToast = useStore((s) => s.showToast);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState<null | { type: string; value: string; label: string }>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(async () => {
    if (isSpinning || (user?.wheelSpins ?? 0) <= 0) return;

    setIsSpinning(true);
    setShowResult(null);

    try {
      const result = await spinMutation.mutateAsync();

      // Find segment angle
      const segment = SEGMENTS.find((s) => s.type === result.reward.type);
      const targetAngle = segment ? segment.angle : 0;

      // Calculate rotation: at least 5 full spins + target
      const spins = 5 + Math.floor(Math.random() * 3);
      const finalRotation = rotation + spins * 360 + (360 - targetAngle);

      setRotation(finalRotation);

      // Show result after animation
      setTimeout(() => {
        setShowResult(result.reward);
        setIsSpinning(false);
        refetchUser();
        refetchHistory();
        showToast(`Вы выиграли: ${result.reward.label}!`, "success");
      }, 4500);
    } catch (err: any) {
      showToast(err.message || "Ошибка", "error");
      setIsSpinning(false);
    }
  }, [isSpinning, user?.wheelSpins, rotation, spinMutation, refetchUser, refetchHistory, showToast]);

  const unusedRewards = history?.filter((r) => !r.used) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="pb-24 pt-4 px-4 space-y-4"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Колесо Удачи</h1>
        <p className="text-sm text-white/50 mt-1">Крутите и выигрывайте призы!</p>
        <div className="mt-3 inline-flex items-center gap-2 accent-gradient rounded-full px-4 py-1.5">
          <RotateCw size={14} className="text-[#0B1628]" />
          <span className="text-sm font-semibold text-[#0B1628]">
            Доступно прокруток: {user?.wheelSpins ?? 0}
          </span>
        </div>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />
          </div>

          {/* Wheel */}
          <motion.div
            ref={wheelRef}
            className="w-[280px] h-[280px] rounded-full relative overflow-hidden border-4 border-[rgba(64,224,208,0.2)] shadow-2xl"
            style={{
              background: `conic-gradient(
                ${SEGMENTS.map((s, i) => `${s.color}${i % 2 === 0 ? "CC" : "99"} ${s.angle}deg ${s.angle + 45}deg`).join(", ")}
              )`,
            }}
            animate={{ rotate: rotation }}
            transition={{
              duration: isSpinning ? 4.5 : 0,
              ease: [0.15, 0, 0.15, 1],
            }}
          >
            {/* Segment labels */}
            {SEGMENTS.map((segment) => {
              const midAngle = (segment.angle + 22.5) * (Math.PI / 180);
              const x = 50 + 32 * Math.cos(midAngle);
              const y = 50 + 32 * Math.sin(midAngle);
              return (
                <div
                  key={segment.type}
                  className="absolute text-white text-[10px] font-bold text-center leading-tight"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {segment.label.split("\n").map((line, j) => (
                    <span key={j} className="block">{line}</span>
                  ))}
                </div>
              );
            })}

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full bg-[#0B1628] border-2 border-[#40E0D0] flex items-center justify-center z-10">
              <Gift size={24} className="text-[#40E0D0]" />
            </div>
          </motion.div>
        </div>

        {/* Spin Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSpin}
          disabled={isSpinning || (user?.wheelSpins ?? 0) <= 0}
          className={`mt-6 px-10 py-3.5 rounded-xl font-semibold text-base transition-all ${
            isSpinning || (user?.wheelSpins ?? 0) <= 0
              ? "bg-white/10 text-white/30 cursor-not-allowed"
              : "accent-gradient text-[#0B1628] shadow-[0_4px_16px_rgba(64,224,208,0.3)] hover:shadow-[0_4px_24px_rgba(64,224,208,0.5)]"
          }`}
        >
          {isSpinning ? "Крутится..." : user?.wheelSpins ?? 0 > 0 ? "Крутить!" : "Нет прокруток"}
        </motion.button>
      </div>

      {/* Unused Rewards */}
      {unusedRewards.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Неиспользованные призы</h3>
          <div className="space-y-2">
            {unusedRewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between bg-[#152238] rounded-lg p-2.5">
                <span className="text-sm text-white">{reward.rewardValue}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#40E0D0]/20 text-[#40E0D0]">Активен</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowResult(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card p-6 max-w-[300px] w-full text-center border-2 border-[#40E0D0]/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full accent-gradient mx-auto flex items-center justify-center mb-4">
                <Gift size={28} className="text-[#0B1628]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Поздравляем!</h3>
              <p className="text-3xl font-bold text-gradient-cyan mb-1">{showResult.label}</p>
              <p className="text-xs text-white/50 mb-5">Приз добавлен в ваши награды</p>
              <button
                onClick={() => setShowResult(null)}
                className="w-full accent-gradient text-[#0B1628] font-semibold py-2.5 rounded-xl"
              >
                Отлично!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
