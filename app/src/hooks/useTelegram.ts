import { useCallback } from "react";

export function useTelegram() {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const isInTelegram = !!tg;

  const haptic = useCallback(
    (style: "light" | "medium" | "heavy" = "light") => {
      tg?.HapticFeedback?.impactOccurred(style);
    },
    [tg]
  );

  const hapticNotify = useCallback(
    (type: "error" | "success" | "warning") => {
      tg?.HapticFeedback?.notificationOccurred(type);
    },
    [tg]
  );

  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      tg?.MainButton?.setText(text);
      tg?.MainButton?.onClick(onClick);
      tg?.MainButton?.show();
    },
    [tg]
  );

  const hideMainButton = useCallback(() => {
    tg?.MainButton?.hide();
  }, [tg]);

  const getStartParam = useCallback(() => {
    return tg?.initDataUnsafe?.start_param;
  }, [tg]);

  const getUser = useCallback(() => {
    return tg?.initDataUnsafe?.user;
  }, [tg]);

  return {
    isInTelegram,
    tg,
    haptic,
    hapticNotify,
    showMainButton,
    hideMainButton,
    getStartParam,
    getUser,
  };
}
