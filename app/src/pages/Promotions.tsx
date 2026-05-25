import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, X, Tag } from "lucide-react";
import { trpc } from "@/providers/trpc";
import type { Promotion } from "@db/schema";

export default function Promotions() {
  const { data: promotions } = trpc.promotion.list.useQuery();
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  // Mock weather
  const weather = {
    temp: 24,
    wind: 3,
    condition: "sunny" as const,
    supGood: true,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="pb-24 pt-4 px-4 space-y-4"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Акции</h1>
        <p className="text-sm text-white/50 mt-1">Специальные предложения</p>
      </div>

      {/* Weather Widget */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
          <Sun size={24} className="text-[#FFD700]" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{weather.temp}°C</p>
          <p className="text-xs text-white/50">Ветер: {weather.wind} м/с</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-medium ${weather.supGood ? "text-green-400" : "text-yellow-400"}`}>
            {weather.supGood ? "Отлично для SUP!" : "Будьте осторожны"}
          </p>
          <p className="text-[10px] text-white/40">Сегодня</p>
        </div>
      </div>

      {/* Promotions List */}
      <div className="space-y-3">
        {promotions?.map((promo, i) => (
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card overflow-hidden cursor-pointer hover:border-[rgba(64,224,208,0.25)] transition-colors"
            onClick={() => setSelectedPromo(promo)}
          >
            {promo.image && (
              <div className="w-full h-40 overflow-hidden">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-white">{promo.title}</h3>
                {promo.discount && promo.discount > 0 && (
                  <span className="shrink-0 text-xs font-bold accent-gradient text-[#0B1628] px-2 py-0.5 rounded-full">
                    -{promo.discount}%
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 mt-1.5 line-clamp-2">{promo.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Tag size={12} className="text-[#40E0D0]" />
                <span className="text-[10px] text-[#40E0D0]">До {promo.endDate}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {(!promotions || promotions.length === 0) && (
          <div className="glass-card p-8 text-center">
            <Tag size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">Пока нет активных акций</p>
          </div>
        )}
      </div>

      {/* Promo Detail Modal */}
      <AnimatePresence>
        {selectedPromo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedPromo(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-[480px] mx-auto bg-[#0B1628] rounded-t-3xl overflow-hidden max-h-[80vh] overflow-y-auto">
                {selectedPromo.image && (
                  <div className="w-full h-52 relative">
                    <img src={selectedPromo.image} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setSelectedPromo(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedPromo.title}</h2>
                    {selectedPromo.discount && selectedPromo.discount > 0 && (
                      <span className="shrink-0 text-sm font-bold accent-gradient text-[#0B1628] px-3 py-1 rounded-full">
                        -{selectedPromo.discount}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{selectedPromo.description}</p>
                  {selectedPromo.terms && (
                    <div className="glass-card p-3 bg-[#152238]">
                      <p className="text-xs text-white/40 mb-1">Условия акции</p>
                      <p className="text-sm text-white/70">{selectedPromo.terms}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-[#40E0D0]" />
                    <span className="text-sm text-[#40E0D0]">С {selectedPromo.startDate} по {selectedPromo.endDate}</span>
                  </div>
                  <button
                    onClick={() => setSelectedPromo(null)}
                    className="w-full accent-gradient text-[#0B1628] font-semibold py-3 rounded-xl"
                  >
                    Воспользоваться
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
