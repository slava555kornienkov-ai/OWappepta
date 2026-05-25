import { motion } from "framer-motion";
import { User, Gift, Calendar, Tag, MessageCircle } from "lucide-react";
import { useStore } from "@/store";

const tabs = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "wheel", label: "Колесо", icon: Gift },
  { id: "booking", label: "Бронь", icon: Calendar },
  { id: "promotions", label: "Акции", icon: Tag },
  { id: "support", label: "Поддержка", icon: MessageCircle },
];

export default function BottomNav() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B1628]/80 backdrop-blur-xl border-t border-[rgba(64,224,208,0.1)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#40E0D0]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={isActive ? "text-[#40E0D0] drop-shadow-[0_0_8px_rgba(64,224,208,0.4)]" : "text-white/40"}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-[#40E0D0]" : "text-white/40"
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
