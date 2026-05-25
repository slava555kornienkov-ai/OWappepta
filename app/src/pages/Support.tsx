import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, MessageCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";

const QUICK_QUESTIONS = ["Как добраться?", "Что взять с собой?", "Правила аренды", "Отмена брони"];

export default function Support() {
  const { data: chatData, refetch } = trpc.support.getChat.useQuery();
  const sendMessage = trpc.support.sendMessage.useMutation({ onSuccess: () => refetch() });
  const markRead = trpc.support.markRead.useMutation();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatData?.messages]);

  useEffect(() => {
    markRead.mutate();
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ message: message.trim() });
    setMessage("");
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage.mutate({ message: q });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-white">Поддержка</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <p className="text-sm text-white/50">Оператор онлайн</p>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="shrink-0 px-4 pb-3">
        <p className="text-xs text-white/40 mb-2">Частые вопросы:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleQuickQuestion(q)}
              className="px-3 py-1.5 rounded-full bg-[#152238] border border-[rgba(64,224,208,0.15)] text-xs text-[#40E0D0] hover:border-[#40E0D0]/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-3 scrollbar-hide">
        {(!chatData?.messages || chatData.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle size={40} className="text-white/10 mb-3" />
            <p className="text-sm text-white/30">Напишите нам — мы ответим в течение минуты</p>
          </div>
        )}
        {chatData?.messages.map((msg) => {
          const isUser = msg.senderRole === "user";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: isUser ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 ${
                  isUser
                    ? "accent-gradient text-[#0B1628] rounded-2xl rounded-br-sm"
                    : "glass-card text-white rounded-2xl rounded-bl-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isUser ? "text-[#0B1628]/50" : "text-white/30"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 bg-[#0B1628]/80 backdrop-blur-xl border-t border-[rgba(64,224,208,0.1)]">
        <div className="flex items-center gap-2 max-w-[480px] mx-auto">
          <button className="w-9 h-9 rounded-full bg-[#152238] flex items-center justify-center text-white/40 hover:text-[#40E0D0] shrink-0">
            <Paperclip size={18} />
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Введите сообщение..."
            className="flex-1 bg-[#152238] rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/30 border border-[rgba(64,224,208,0.1)] focus:border-[#40E0D0]/30 outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-9 h-9 rounded-full accent-gradient flex items-center justify-center shrink-0 disabled:opacity-30"
          >
            <Send size={16} className="text-[#0B1628]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
