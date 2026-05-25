import { create } from "zustand";

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: "profile",
  setActiveTab: (tab) => set({ activeTab: tab }),
  toast: null,
  showToast: (message, type = "info") => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
  isAdmin: false,
  setIsAdmin: (v) => set({ isAdmin: v }),
}));
