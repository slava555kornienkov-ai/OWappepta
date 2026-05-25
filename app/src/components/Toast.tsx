import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info } from "lucide-react";
import { useStore } from "@/store";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-[100] max-w-[480px] mx-auto"
        >
          <div className="glass-card p-3 flex items-center gap-3 border-l-4"
            style={{
              borderLeftColor: toast.type === "success" ? "#4CAF50" : toast.type === "error" ? "#EF5350" : "#40E0D0",
            }}
          >
            {toast.type === "success" ? <CheckCircle size={18} className="text-green-400 shrink-0" /> :
             toast.type === "error" ? <XCircle size={18} className="text-red-400 shrink-0" /> :
             <Info size={18} className="text-cyan-400 shrink-0" />}
            <p className="text-sm text-white">{toast.message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
