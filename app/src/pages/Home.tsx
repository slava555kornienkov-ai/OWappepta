import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import Toast from "@/components/Toast";
import Profile from "./Profile";
import Wheel from "./Wheel";
import BookingPage from "./BookingPage";
import Promotions from "./Promotions";
import Support from "./Support";

export default function Home() {
  const activeTab = useStore((s) => s.activeTab);
  const { user } = useAuth();

  // Set admin state based on user role
  useEffect(() => {
    if (user?.role === "admin") {
      useStore.getState().setIsAdmin(true);
    }
  }, [user]);

  const renderTab = () => {
    switch (activeTab) {
      case "profile":
        return <Profile key="profile" />;
      case "wheel":
        return <Wheel key="wheel" />;
      case "booking":
        return <BookingPage key="booking" />;
      case "promotions":
        return <Promotions key="promotions" />;
      case "support":
        return <Support key="support" />;
      default:
        return <Profile key="profile" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1628] ocean-gradient max-w-[480px] mx-auto relative">
      {/* Main Content */}
      <main className="min-h-screen">
        <AnimatePresence mode="wait">
          {renderTab()}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}
